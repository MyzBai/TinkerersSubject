import { init as initHome } from './home/home';
import { queryHTML, registerTabs, tabCallback } from './utils/helpers';
import { visibilityObserver } from './utils/Observers';



const mainPageNavButton = queryHTML('body > header button');
const homePage = queryHTML('.p-home');
const gamePage = queryHTML('.p-game');

// declare global {
//     var envVariables: EnvironmentVariables;
// }

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

// visibilityObserver(homePage, visible => {
//     console.log('homePage visible:', visible);
//     if (visible) {
//         mainPageNavButton.textContent = 'Back';
//         mainPageNavButton.setAttribute('data-tab-target', 'game');
//     }
// });
// visibilityObserver(gamePage, visible => {
//     console.log('gamePage visible:', visible);
//     if (visible) {
//         mainPageNavButton.textContent = 'Home';
//         mainPageNavButton.classList.remove('hidden');
//         mainPageNavButton.setAttribute('data-tab-target', 'home');
//     }
// });

init();

async function init() {

    await initHome();
    document.body.classList.remove('hidden');
}
