import { queryHTML } from "@src/utils/helpers";
import { GenericModal } from "@src/webComponents/GenericModal";
import type Game from "./Game";
import { visibilityObserver } from "@src/utils/Observers";

export default class Settings {
    private readonly deleteSaveButton = queryHTML<HTMLButtonElement>('.p-settings [data-delete-save]');
    constructor(readonly game: Game) {

        visibilityObserver(queryHTML('.p-game .p-settings'), async visible => {
            if (visible) {
                const hasSave = await this.game.hasSave(this.game.config.meta.id);
                this.deleteSaveButton.classList.toggle('hidden', !hasSave);
            }
        });
        this.deleteSaveButton.addEventListener('click', this.openDeleteSaveModal.bind(this));

    }

    openDeleteSaveModal() {
        const modal = queryHTML<GenericModal>('generic-modal');
        modal.init({
            title: 'Delete Save',
            message: 'Are you sure?',
            confirmLabel: 'Yes',
            cancelLabel: 'No',
            footerText: 'This will delete your save file permanently',
            callback: async (confirm) => {
                if (confirm) {
                    await this.game.deleteSave();
                    //dispose game and return to home
                    this.game.dispose();
                    this.game.home.init();
                }
            }
        });
        modal.openModal();
    }
}