import { queryHTML } from "@src/utils/helpers";

type ActionCallback = (confirm: Boolean, userData: any) => void;
interface InitParams {
    title?: string;
    body: HTMLElement | string;
    buttons: { type: 'confirm' | 'cancel', label: string, userData?: any }[]
    footerText?: string;
    callback?: ActionCallback;
}

export class GenericModal extends HTMLElement {
    readonly modal: HTMLDialogElement;
    constructor() {
        super();

        this.innerHTML = `
        <dialog>
            <form method="dialog">
                <header>
                    <h3>Title</h3>
                </header>
                <div data-body></div>
                <footer>
                    <div data-buttons></div>
                    <span data-text></span>
                </footer>
            </form>
            <div class="backdrop"></div>
        </dialog>`;


        this.modal = queryHTML<HTMLDialogElement>('dialog', this);

        queryHTML('.backdrop').addEventListener('mousedown', () => this.closeModal());
        this.classList.add('hidden');
    }

    connectedCallback() {
        if (this.hasAttribute('data-open')) {
            this.openModal();
        }
    }

    init(args: InitParams) {
        queryHTML('header h3', this.modal).textContent = args.title || '';
        if (typeof args.body === 'string') {
            queryHTML('[data-body]', this.modal).innerHTML = args.body;
        } else {
            queryHTML('[data-body]', this.modal).replaceChildren(args.body);
        }
        const buttons: HTMLButtonElement[] = [];
        for (const buttonData of args.buttons) {
            const button = document.createElement('button');
            button.classList.add('g-button');
            button.setAttribute('type', 'submit');
            const role = buttonData.type;
            button.setAttribute('data-role', role);
            button.textContent = buttonData.label;
            button.addEventListener('click', () => {
                args.callback?.(role === 'confirm', buttonData.userData);
            });
            buttons.push(button);
        }
        queryHTML('footer [data-buttons]', this).replaceChildren(...buttons);
        queryHTML('footer [data-text]').textContent = args.footerText || '';
    }

    openModal() {
        this.modal.show();
        this.classList.remove('hidden');
    }

    closeModal() {
        this.modal.close();
        this.classList.add('hidden');
    }

}

customElements.define('generic-modal', GenericModal);