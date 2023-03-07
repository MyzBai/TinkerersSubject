interface Button {
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

    element.querySelectorForce<HTMLElement>('header h3').innerText = opts.title || '';
    element.querySelectorForce<HTMLElement>('[data-body]').innerText = opts.body;
    element.querySelectorForce<HTMLElement>('footer small').innerText = opts.footerText || '';

    element.querySelectorForce('.backdrop').addEventListener('mousedown', () => {
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
    element.querySelectorForce('.s-buttons').append(...buttons);

    document.body.appendChild(element);
}