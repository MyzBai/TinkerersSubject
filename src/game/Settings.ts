import { querySelector, registerTabs } from "@src/utils/helpers";
import { GenericModal } from "@src/webComponents/GenericModal";
import type Game from "./Game";

export default class Settings {
    private readonly page = querySelector('.p-game .p-settings');
    private readonly deleteSaveButton = querySelector<HTMLButtonElement>('.p-settings [data-delete-save]');
    constructor(readonly game: Game) {

        this.deleteSaveButton.addEventListener('click', this.openDeleteSaveModal.bind(this));

        registerTabs(querySelector('.p-settings menu', this.page), this.page);
        querySelector('.p-settings menu [data-tab-target="general"]', this.page).click();
    }


    private openDeleteSaveModal() {
        const modal = querySelector<GenericModal>('body > generic-modal');
        modal.init({
            title: 'Delete Save',
            body: 'Are you sure?',
            buttons: [{ label: 'Yes', type: 'confirm' }, { label: 'No', type: 'cancel' }],
            footerText: 'This will delete your save file permanently',
            callback: async (confirm) => {
                if (confirm) {
                    querySelector('[data-target="home"]').click();
                    await this.game.deleteSave(this.game.config.meta.id);
                    //dispose game and return to home
                    this.game.home.init();
                }
            }
        });
        modal.openModal();
    }
}