import { init as initHome } from './home/home';
import { queryHTML, registerTabs, tabCallback } from './utils/helpers';
import { visibilityObserver } from './utils/Observers';

const mainPageNavButton = queryHTML('body > header button');
const homePage = queryHTML('.p-home');
const gamePage = queryHTML('.p-game');

registerTabs(mainPageNavButton.parentElement!, document.body, tabCallback);

init();

async function init() {

    await initHome();

    setupUI();

    document.body.classList.remove('hidden');
}

function setupUI(){
    visibilityObserver(homePage, visible => {
        if(visible){
            mainPageNavButton.textContent = 'Back';
            mainPageNavButton.setAttribute('data-tab-target', 'game');
        }
    });
    visibilityObserver(gamePage, visible => {
        if(visible){
            mainPageNavButton.textContent = 'Home';
            mainPageNavButton.classList.remove('hidden');
            mainPageNavButton.setAttribute('data-tab-target', 'home');
        }
    });

}