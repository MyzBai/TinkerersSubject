import Game from "@src/game/Game";
import Statistics from "@src/game/Statistics";
import { querySelector } from "@src/utils/helpers";
import type { CraftId } from "./crafting";
import type Items from "./Items";

export default class CraftPresets {
    presets: CraftPreset[] = [];
    activePreset?: CraftPreset;
    private readonly modal: HTMLDialogElement;
    constructor(readonly items: Items) {

        this.modal = this.items.page.querySelectorForce<HTMLDialogElement>('.p-game .p-items [data-preset-modal]');

        //new preset button
        querySelector('.s-preset-container [data-new]').addEventListener('click', () => {
            const preset = this.newPreset();
            this.editActivePreset();
            preset.element.click();
        });
        //edit preset button
        querySelector('.s-preset-container [data-edit]').addEventListener('click', () => this.editActivePreset());

        //preset modal apply button
        this.modal.querySelectorForce('[data-apply]').addEventListener('click', () => {
            if (!this.activePreset) {
                return;
            }
            const newIds = [...this.modal.querySelectorAll<HTMLTableRowElement>('[data-craft-list] table [data-id]')].filter(x => x.classList.contains('selected')).map(x => x.getAttribute('data-id'));
            this.activePreset!.ids = newIds as CraftId[];
            const name = this.modal.querySelector<HTMLInputElement>('input[data-name]')!.value;
            if (name !== this.activePreset.name) {
                this.activePreset.name = name;
            }
            this.selectPreset(this.activePreset);
        });
        //preset modal delete button
        this.modal.querySelectorForce('[data-delete]').addEventListener('click', () => this.deleteActivePreset());

        this.createDefaultPreset();
        for (const savedPreset of Game.saveObj?.items?.craftPresets || []) {
            if (savedPreset?.name && savedPreset.ids) {
                this.newPreset(savedPreset.name, savedPreset.ids as CraftId[]);
            }
        }
    }

    private createDefaultPreset() {
        const preset = this.newPreset('Default');
        preset.editable = false;
        this.selectPreset(preset);
    }

    newPreset(name = 'New', ids: CraftId[] = this.items.data.craftList.map(x => x.id)) {
        const preset = new CraftPreset(name, ids);
        preset.element.addEventListener('click', () => {
            this.presets.forEach(x => x.element.classList.toggle('selected', x === preset));
            this.selectPreset(preset);
        });
        querySelector('.s-preset-container [data-preset-list]').appendChild(preset.element);
        this.presets.push(preset);
        preset.element.click();
        return preset;
    }

    selectPreset(preset?: CraftPreset) {
        this.activePreset = preset;
        this.items.updateCraftList(this.activePreset?.ids);
        const canEdit = typeof this.activePreset !== 'undefined' && this.activePreset.editable;
        this.items.page.querySelector<HTMLButtonElement>('.s-preset-container [data-edit]')!.disabled = !canEdit;
    }

    editActivePreset() {
        if (!this.activePreset) {
            return;
        }
        const modal = querySelector<HTMLDialogElement>('.p-game .p-items [data-preset-modal]');

        modal.querySelector<HTMLInputElement>('input[data-name]')!.value = this.activePreset?.name;
        const filteredCraftList = this.items.data.craftList.filter(x => x.levelReq <= Statistics.gameStats.Level.get());
        const rows = [] as HTMLTableRowElement[];
        for (const craftData of filteredCraftList) {
            const label = this.items.craftDescToHtml(craftData.id);
            const row = document.createElement('tr');
            row.classList.add('g-list-item');
            row.classList.toggle('selected', this.activePreset.ids.includes(craftData.id));
            row.setAttribute('data-id', craftData.id);
            row.insertAdjacentHTML('beforeend', `
                <td>${label}</td>
                <td>${craftData.levelReq}</td>
                <td class="g-gold">${craftData.goldCost}</td>`);
            row.addEventListener('click', () => {
                row.classList.toggle('selected', !row.classList.contains('selected'));
            });
            rows.push(row);
        }

        modal.querySelector<HTMLTableElement>('[data-craft-list] table tbody')!.replaceChildren(...rows);
        modal.showModal();
    }

    deleteActivePreset() {
        if (!this.activePreset) {
            return;
        }
        this.activePreset.element.remove();
        this.presets.splice(this.presets.indexOf(this.activePreset), 1);
        if (this.presets.length === 0) {
            this.items.updateCraftList();
            this.selectPreset(undefined);
        } else {
            this.presets[0]?.element.click();
        }
    }
}

class CraftPreset {
    readonly element: HTMLLIElement;
    editable = true;
    constructor(private _name: string, public ids: CraftId[]) {
        this.element = this.createElement();
    }
    get name() {
        return this._name;
    }
    set name(v: string) {
        this.element.textContent = v;
    }
    private createElement() {
        const li = document.createElement('li');
        li.classList.add('g-list-item');
        li.setAttribute('data-name', this.name);
        li.textContent = this.name;
        return li;
    }
}

export interface CraftPresetSave {
    name: string;
    ids: CraftId[];
}