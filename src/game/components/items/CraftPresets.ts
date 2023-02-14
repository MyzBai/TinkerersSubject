import { queryHTML, registerMutationObserver, registerTabs } from "@src/utils/helpers";
import { CraftId, craftTemplates } from "./crafting";
import type Items from "./items";

export default class CraftPresets {
    presets: CraftPreset[];
    activePreset?: CraftPreset;
    private modal: HTMLDialogElement;
    private newPresetButton: HTMLButtonElement;
    private editPresetButton: HTMLButtonElement;
    private applyPresetButton: HTMLButtonElement;
    private deletePresetButton: HTMLButtonElement;
    private newPresetCallback: () => void;
    private editPresetCallback: () => void;
    private applyPresetCallback: () => void;
    private deletePresetCallback: () => void;
    constructor(readonly items: Items) {
        this.presets = [];

        this.newPresetCallback = () => {
            const preset = this.newPreset();
            this.editActivePreset();
            preset.element.click();
        };
        this.editPresetCallback = () => {
            this.editActivePreset();
        };
        this.applyPresetCallback = () => {
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
        };
        this.deletePresetCallback = () => {
            this.deleteActivePreset();
        };

        this.modal = queryHTML('.p-game .p-items [data-preset-modal]');
        this.newPresetButton = queryHTML('.s-preset-container [data-new]');
        this.editPresetButton = queryHTML('.s-preset-container [data-edit]');
        this.applyPresetButton = queryHTML('[data-apply]', this.modal);
        this.deletePresetButton = queryHTML('[data-delete]', this.modal);

        this.newPresetButton.addEventListener('click', this.newPresetCallback);
        this.editPresetButton.addEventListener('click', this.editPresetCallback);
        this.applyPresetButton.addEventListener('click', this.applyPresetCallback);
        this.deletePresetButton.addEventListener('click', this.deletePresetCallback);

        this.newPreset('Default', items.data.craftList.map(x => x.id));
    }

    dispose() {
        this.newPresetButton.removeEventListener('click', this.newPresetCallback);
        this.editPresetButton.removeEventListener('click', this.editPresetCallback);
        this.deletePresetButton.removeEventListener('click', this.deletePresetCallback);
        this.applyPresetButton.removeEventListener('click', this.applyPresetCallback);
        queryHTML('.s-preset-container [data-preset-list]').replaceChildren();
        queryHTML('[data-craft-list] table tbody', this.modal).replaceChildren();
    }

    newPreset(name = 'New', ids: CraftId[] = this.items.data.craftList.map(x => x.id)) {
        const preset = new CraftPreset(name, ids);
        preset.element.addEventListener('click', () => {
            this.presets.forEach(x => x.element.classList.toggle('selected', x === preset));
            this.selectPreset(preset);
        });
        queryHTML('.s-preset-container [data-preset-list]').appendChild(preset.element);
        this.presets.push(preset);
        preset.element.click();
        return preset;
    }

    selectPreset(preset?: CraftPreset) {
        this.activePreset = preset;
        this.items.populateCraftList(this.activePreset?.ids);
        this.editPresetButton.disabled = typeof this.activePreset === 'undefined';
    }

    editActivePreset() {
        if (!this.activePreset) {
            return;
        }
        const modal = queryHTML<HTMLDialogElement>('.p-game .p-items [data-preset-modal]');

        queryHTML<HTMLInputElement>('input[data-name]', modal).value = this.activePreset?.name;
        const filteredCraftList = this.items.data.craftList.filter(x => x.levelReq <= this.items.game.player.stats.level.get());
        const rows = [] as HTMLTableRowElement[];
        for (const craftData of filteredCraftList) {
            const label = craftTemplates[craftData.id].desc;
            const row = document.createElement('tr');
            row.classList.add('g-list-item');
            row.classList.toggle('selected', this.activePreset.ids.includes(craftData.id));
            row.setAttribute('data-id', craftData.id);
            row.insertAdjacentHTML('beforeend', `
                <td>${label}</td>
                <td>${craftData.levelReq}</td>
                <td class="g-gold">${craftData.cost}</td>`);
            row.addEventListener('click', () => {
                row.classList.toggle('selected', !row.classList.contains('selected'));
            })
            rows.push(row);
        }

        queryHTML<HTMLTableElement>('[data-craft-list] table tbody', modal).replaceChildren(...rows);
        modal.showModal();
    }

    deleteActivePreset() {
        if (!this.activePreset) {
            return;
        }
        this.activePreset.element.remove();
        this.presets.splice(this.presets.indexOf(this.activePreset), 1);
        this.presets[0]?.element.click();
    }
}

class CraftPreset {
    readonly element: HTMLLIElement;
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