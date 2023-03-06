import Home from './Home';

window.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {

    const home = new Home();
    await home.tryLoadRecentSave();
    document.body.classList.remove('hidden');
}
