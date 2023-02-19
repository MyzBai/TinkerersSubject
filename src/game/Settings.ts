import { queryHTML } from "@src/utils/helpers";
import { GenericModal } from "@src/webComponents/GenericModal";
import type Game from "./Game";

export default class Settings {
    private readonly deleteSaveButton = queryHTML<HTMLButtonElement>('.p-settings [data-delete-save]');
    constructor(readonly game: Game) {

        this.deleteSaveButton.addEventListener('click', this.openDeleteSaveModal.bind(this));

    }


    private openDeleteSaveModal() {
        const modal = queryHTML<GenericModal>('generic-modal');
        modal.init({
            title: 'Delete Save',
            body: 'Are you sure?',
            buttons: [{ label: 'Yes', type: 'confirm' }, { label: 'No', type: 'cancel' }],
            footerText: 'This will delete your save file permanently',
            callback: async (confirm) => {
                if (confirm) {
                    await this.game.deleteSave();
                    //dispose game and return to home
                    this.game.home.init();
                }
            }
        });
        modal.openModal();
    }
}