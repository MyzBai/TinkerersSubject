import { init as initHome } from './home/home';
import { queryHTML, registerTabs, tabCallback } from './utils/helpers';

const mainPageNavButton = queryHTML('body > header button');

registerTabs(mainPageNavButton.parentElement!, document.body, (btn: HTMLElement, content: HTMLElement) => {
    tabCallback(btn, content);
    const attr = btn.getAttribute('data-tab-target');
    switch (attr) {
        case 'home':
            btn.textContent = 'Back';
            btn.setAttribute('data-tab-target', 'game');
            break;
            case 'game': 
            btn.textContent = 'Home'; 
            btn.setAttribute('data-tab-target', 'home');
            break;
    }
});

init();

async function init() {

    await initHome();
    document.body.classList.remove('hidden');
}
