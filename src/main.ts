import './webComponents/GameElement';
import './webComponents/GenericModal';
import Home from './Home';

window.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {

    const home = new Home();
    await home.init();
    await home.tryLoadRecentSave();

    document.body.classList.remove('hidden');
}
