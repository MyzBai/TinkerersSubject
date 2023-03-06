import { querySelector } from "./helpers";


interface Button{
    label: string;
    type: 'confirm' | 'cancel';
    callback?: (args?: any) => void;
    args?: any;
}
interface AlertParams {
    title?: string;
    body: string;
    buttons?: Button[]
    footerText?: string;
}

export default function customAlert(opts: AlertParams) {
    const element = document.createElement('div');
    element.classList.add('g-alert-window');
    element.innerHTML = `
        <div class="s-content">
            <header><h3></h3></header>
            <div data-body></div>
            <div class="s-buttons"></div>
            <footer><small></small></footer>
        </div>
        <div class="backdrop"></div>`;

    querySelector('header h3', element).innerText = opts.title || '';
    querySelector('[data-body]', element).innerText = opts.body;
    querySelector('footer small', element).innerText = opts.footerText || '';

    querySelector('.backdrop', element).addEventListener('mousedown', () => {
        element.remove();
    });

    const buttons: HTMLButtonElement[] = [];
    for (const buttonData of opts.buttons || []) {
        const button = document.createElement('button');
        button.classList.add('g-button');
        button.setAttribute('type', 'submit');
        const role = buttonData.type;
        button.setAttribute('data-role', role);
        button.textContent = buttonData.label;
        button.addEventListener('click', () => {
            buttonData.callback?.(buttonData.args);
            element.remove();
        });
        buttons.push(button);

    }
    querySelector('.s-buttons', element).append(...buttons);

    document.body.appendChild(element);
}