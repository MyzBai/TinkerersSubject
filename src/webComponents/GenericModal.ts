import { querySelector } from "@src/utils/helpers";

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
                <footer></footer>
            </form>
            <div class="backdrop"></div>
        </dialog>`;


        this.modal = querySelector<HTMLDialogElement>('dialog', this);

        querySelector('.backdrop').addEventListener('mousedown', () => this.closeModal());
        this.classList.add('hidden');
    }

    connectedCallback() {
        if (this.hasAttribute('data-open')) {
            this.openModal();
        }
    }

    init(args: InitParams) {
        querySelector('header h3', this.modal).textContent = args.title || '';
        if (typeof args.body === 'string') {
            querySelector('[data-body]', this.modal).innerHTML = args.body;
        } else {
            querySelector('[data-body]', this.modal).replaceChildren(args.body);
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
        querySelector('footer', this).replaceChildren(...buttons);
        if(args.footerText){
            querySelector('footer', this).insertAdjacentHTML('beforeend', `<small>${args.footerText}</small>`);
        }
        return this;
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