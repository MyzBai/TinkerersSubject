import { queryHTML } from "@src/utils/helpers";
import genericModalHtml from './html/genericModal.html';

type ActionCallback = (confirm: Boolean) => void;
interface InitParams {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    footerText?: string;
    callback?: ActionCallback;
}

export class GenericModal extends HTMLElement {
    readonly modal: HTMLDialogElement;
    readonly confirmButton: HTMLButtonElement;
    readonly cancelButton: HTMLButtonElement;
    private actionCallback?: ActionCallback;
    constructor() {
        super();

        this.innerHTML = genericModalHtml;

        this.modal = queryHTML<HTMLDialogElement>('dialog', this);
        this.confirmButton = queryHTML('[data-role="confirm"]', this);
        this.cancelButton = queryHTML('[data-role="cancel"]', this);

        this.classList.add('hidden');
    }

    connectedCallback() {
        this.confirmButton.addEventListener('click', () => {
            this.actionCallback?.(true);
        });
        this.cancelButton.addEventListener('click', () => {
            this.actionCallback?.(false);
        });
    }

    init(args: InitParams) {
        queryHTML('header h3', this.modal).textContent = args.title;
        queryHTML('[data-body]', this.modal).textContent = args.message;
        if (args.confirmLabel) {
            this.confirmButton.textContent = args.confirmLabel;
        } else {
            this.confirmButton.classList.add('hidden');
        }
        if (args.cancelLabel) {
            this.cancelButton.textContent = args.cancelLabel;
        } else {
            this.cancelButton.classList.add('hidden');
        }

        this.cancelButton.classList.toggle('hidden', !args.cancelLabel);
        this.confirmButton.classList.toggle('hidden', !args.confirmLabel);

        this.actionCallback = args.callback;
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