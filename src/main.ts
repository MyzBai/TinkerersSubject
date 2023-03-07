import home from './Home';

window.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {

    await home.tryLoadRecentSave();
    document.body.classList.remove('hidden');
}
