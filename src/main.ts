import './webComponents/GameElement';
import './webComponents/GenericModal';
import { queryHTML } from './utils/helpers';
import Home from './Home';
queryHTML('header [data-target="game"]').addEventListener('click', (e: MouseEvent) => {
    if (e.target instanceof Element) {
        const target = e.target;
        const attr = e.target.getAttribute('data-target')
        switch (attr) {
            case 'home':
                target.textContent = 'Back';
                target.setAttribute('data-target', 'game');
                queryHTML('.p-home').classList.remove('hidden');
                queryHTML('.p-game').classList.add('hidden');
                break;
            case 'game':
                target.textContent = 'Home';
                target.setAttribute('data-target', 'home');
                queryHTML('.p-home').classList.add('hidden');
                queryHTML('.p-game').classList.remove('hidden');
                break;
        }
    }
});


window.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {

    const home = new Home();
    home.init();
    document.body.classList.remove('hidden');
}
