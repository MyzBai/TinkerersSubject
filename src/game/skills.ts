import type { GConfig, Skills } from "@src/types/gconfig";
import { gameLoop } from "./game";
import { Modifier, StatModifier, StatModifierFlags } from "./mods";
import { modDB, playerStats } from "./player";
import { Save } from "./save";

document.addEventListener('keydown', e => {
    if (e.code === 'KeyL') {
        modDB.add([new StatModifier({ name: 'Duration', valueType: 'Inc', value: 80, flags: StatModifierFlags.Skill })], 'Test');
    }
});

const closeModal = (modal: HTMLElement) => modal.classList.add('hidden');
const openModal = (modal: HTMLElement) => { 
    modal.querySelector<HTMLLIElement>('[data-skill-list] [data-skill-name]')?.click();
    modal.classList.remove('hidden'); 
};

const attackSkillModal = document.querySelector<HTMLDialogElement>('.p-combat [data-attack-skill-modal]');
attackSkillModal.querySelector('[data-value="apply"]').addEventListener('click', () => applyAttackSkill());
attackSkillModal.querySelector('[data-value="cancel"]').addEventListener('click', () => closeModal(attackSkillModal));

const buffSkillModal = document.querySelector<HTMLDialogElement>('.p-combat [data-buff-skill-modal]');
buffSkillModal.querySelector('[data-value="apply"]').addEventListener('click', () => applyBuffSkill());
buffSkillModal.querySelector('[data-value="cancel"]').addEventListener('click', () => closeModal(buffSkillModal));
buffSkillModal.querySelector('[data-value="remove"]').addEventListener('click', () => {
    BuffSkillSlot.active.set(undefined);
    closeModal(buffSkillModal);
});

let attackSkills: AttackSkill[];
let buffSkills: BuffSkill[];
let attackSkillSlot: AttackSkillSlot;
let buffSkillSlots: BuffSkillSlot[];
const attackSkillElement = document.querySelector<HTMLElement>('.p-game .s-player .s-skills [data-attack-skill]');
const buffSkillList = document.querySelector<HTMLUListElement>('.p-game .s-player .s-skills ul[data-buff-skill-list]');

export function init(data: Skills) {

    attackSkills = [];
    buffSkills = [];
    buffSkillSlots = [];
    buffSkillList.replaceChildren();

    data.attackSkills.skillList.sort((a, b) => a.levelReq - b.levelReq);
    if (data.attackSkills.skillList[0].levelReq > 1) {
        throw Error('There must be an attack skill with a level requirement of 1');
    }

    attackSkills = data.attackSkills.skillList.map(x => new AttackSkill(x));
    attackSkillSlot = new AttackSkillSlot();
    attackSkillSlot.set(attackSkills[0]);
    setupModal(attackSkillModal, attackSkills);


    buffSkillSlots = [];
    buffSkillList.replaceChildren();

    if (data.buffSkills) {
        buffSkills = data.buffSkills.skillList.map(x => new BuffSkill(x));
        setupModal(buffSkillModal, buffSkills);

        for (const skillSlot of data.buffSkills.skillSlots) {
            if (skillSlot.levelReq <= 1) {
                buffSkillSlots.push(new BuffSkillSlot());
                continue;
            }
            const id = playerStats.level.onChange.listen(level => {
                if (level < skillSlot.levelReq) {
                    return;
                }
                buffSkillSlots.push(new BuffSkillSlot());
                playerStats.level.onChange.removeListener(id);
            });
        }
    }
}

function setupModal(modal: HTMLElement, skillList: AttackSkill[] | BuffSkill[]) {
    const elements = [] as HTMLElement[];
    for (const skill of skillList) {
        const element = document.createElement('li');
        element.classList.add('g-list-item');
        element.textContent = skill.name;
        element.setAttribute('data-skill-name', skill.name);
        element.addEventListener('click', () => {
            elements.forEach(x => x.classList.toggle('selected', x === element));
            const elementSkillNameAttr = element.getAttribute('data-skill-name');
            const activeSkillName = modal.getAttribute('data-skill-name');
            modal.querySelector('[data-value="apply"]').toggleAttribute('disabled', elementSkillNameAttr === activeSkillName);
            showModalSkillInfo(skill);
        });
        elements.push(element);
    }
    elements[0]?.click();
    modal.querySelector('[data-skill-list]').replaceChildren(...elements);
}

function showModalSkillInfo(skill: AttackSkill | BuffSkill) {
    if (skill.type === 'Attack') {
        showAttackSkillModalInfo(skill);
    } else {
        showBuffSkillModalInfo(skill);
    }
}


function showAttackSkillModalInfo(skill: AttackSkill) {
    const modalInfo = attackSkillModal.querySelector('[data-skill-info]');
    modalInfo.querySelector('[data-title]').textContent = skill.name;
    modalInfo.querySelector('[data-stat="attackSpeed"]').textContent = skill.attackSpeed.toFixed(2);
    modalInfo.querySelector('[data-stat="manaCost"]').textContent = skill.manaCost.toFixed(0);
    modalInfo.querySelector('[data-stat="baseDamageMultiplier"]').textContent = skill.baseDamageMultiplier.toFixed(0) + '%';
    const modElements: HTMLElement[] = [];
    for (const mod of skill.mods) {
        const modElement = document.createElement('div');
        modElement.classList.add('g-mod-desc');
        modElement.textContent = mod.desc;
        modElements.push(modElement);
    }
    modalInfo.querySelector('[data-mod-list]').replaceChildren(...modElements);
}

function applyAttackSkill() {
    const selectedSkillNameAttr = attackSkillModal.querySelector('.selected[data-skill-name]').getAttribute('data-skill-name');
    const skill = attackSkills.find(x => x.name === selectedSkillNameAttr);
    AttackSkillSlot.active.set(skill);
    attackSkillModal.classList.add('hidden');
}

function showBuffSkillModalInfo(skill: BuffSkill) {
    const modalInfo = buffSkillModal.querySelector('[data-skill-info]');
    modalInfo.classList.toggle('hidden', skill == null);
    if (!skill) {
        return;
    }
    modalInfo.querySelector('[data-title]').textContent = skill.name;
    modalInfo.querySelector('[data-stat="baseDuration"]').textContent = `${skill.baseDuration}s`;
    modalInfo.querySelector('[data-stat="manaCost"]').textContent = skill.manaCost.toFixed(0);
    const modElements: HTMLElement[] = [];
    for (const mod of skill.mods) {
        const modElement = document.createElement('div');
        modElement.classList.add('g-mod-desc');
        modElement.textContent = mod.desc;
        modElements.push(modElement);
    }
    modalInfo.querySelector('[data-mod-list]').replaceChildren(...modElements);
    buffSkillModal.querySelector('[data-value="apply"]').setAttribute('data-skill-name', skill.name);
}

function applyBuffSkill() {
    const selectedSkillNameAttr = buffSkillModal.querySelector('.selected[data-skill-name]').getAttribute('data-skill-name');
    const skill = buffSkills.find(x => x.name === selectedSkillNameAttr);
    BuffSkillSlot.active.set(skill);
    buffSkillModal.classList.add('hidden');
}

export function saveSkills(saveObj: Save) {
    saveObj.skills = {
        attackSkillName: attackSkillSlot.skill.name,
        buffSkillNames: buffSkillSlots.map(x => x.skill?.name).filter(x => x)
    }
}

export function loadSkills(saveObj: Save) {
    attackSkillSlot.set(attackSkills.find(x => x.name === saveObj.skills.attackSkillName));
    // buffSkillSlots.forEach((x, i) => x?.set(saveObj.skills.buffSkillNames?.[i]));
    buffSkillSlots.forEach((slot, index) => slot?.set(buffSkills.find(skill => skill.name === saveObj.skills.buffSkillNames?.[index])));
}

class AttackSkill {
    static active: AttackSkill;
    public readonly type = 'Attack';
    readonly name: string;
    readonly levelReq: number;
    readonly attackSpeed: number;
    readonly baseDamageMultiplier: number;
    readonly manaCost: number;
    readonly mods: Modifier[];
    constructor(args: GConfig['skills']['attackSkills']['skillList'][number]) {
        Object.assign(this, args, { mods: args.mods.map(x => new Modifier(x)) });
    }

    get sourceName() { return `Skills/Attack/${this.name}`; }

    enable() {
        modDB.removeBySource(AttackSkill.active?.sourceName);
        AttackSkill.active = this;

        modDB.add([new StatModifier({ name: 'BaseDamageMultiplier', valueType: 'Base', value: this.baseDamageMultiplier })], this.sourceName);
        modDB.add([new StatModifier({ name: 'AttackSpeed', valueType: 'Base', value: this.attackSpeed })], this.sourceName);
        modDB.add([new StatModifier({ name: 'AttackManaCost', valueType: 'Base', value: this.manaCost })], this.sourceName);

        this.mods.forEach(x => modDB.add(x.stats, this.sourceName));
    }

}

class BuffSkill {
    public readonly type = 'Buff';
    readonly name: string;
    readonly levelReq: number;
    readonly baseDuration: number;
    readonly manaCost: number;
    readonly mods: Modifier[];
    constructor(args: GConfig['skills']['buffSkills']['skillList'][number]) {
        Object.assign(this, args, { mods: args.mods.map(x => new Modifier(x)) });
    }

    get sourceName() { return `Skills/Buff/${this.name}`; }
}


class AttackSkillSlot {
    static active: AttackSkillSlot;
    skill: AttackSkill;
    readonly element: HTMLElement;
    constructor() {
        this.element = this.createElement();
    }
    set(skill: AttackSkill) {
        if (!skill) {
            throw Error('There must be an attack skill active');
        }
        this.skill = skill;
        this.skill?.enable();
        this.element.querySelector('[data-label]').textContent = skill?.name || 'Empty';
    }

    edit() {
        AttackSkillSlot.active = this;
        attackSkillModal.setAttribute('data-skill-name', this.skill.name);
        attackSkillModal.querySelectorAll('[data-skill-list] [data-skill-name]').forEach(x => {
            const skillAttr = x.getAttribute('data-skill-name');
            x.toggleAttribute('disabled', skillAttr === this.skill.name);
        });
        openModal(attackSkillModal);
    }

    private createElement() {
        const element = document.createElement('li');
        element.classList.add('g-field');
        element.setAttribute('data-skill-slot', 'attack-skill');
        element.insertAdjacentHTML('beforeend', `<div data-label></div>`);
        element.insertAdjacentHTML('beforeend', `<button class="g-button" data-edit>Edit</button>`);
        element.querySelector('button').addEventListener('click', () => this.edit());
        attackSkillElement.appendChild(element);
        return element;
    }
}

class BuffSkillSlot {
    static active: BuffSkillSlot;
    public skill = undefined as BuffSkill;
    readonly element: HTMLLIElement;
    readonly progressBar: HTMLElement;
    private running: boolean;
    constructor() {
        this.element = this.createElement();
        this.progressBar = this.element.querySelector('[data-progress-bar]');
        this.progressBar.style.width = '0%';
        this.set(undefined);
    }

    set(skill: BuffSkill) {
        this.skill = skill;
        this.element.querySelector('[data-label]').textContent = skill?.name || 'Empty';
    }

    private trigger() {
        if (!this.skill || this.running) {
            return;
        }
        const sufficientMana = playerStats.curMana.get() >= this.skill.manaCost;
        if (!sufficientMana) {
            return;
        }
        this.element.querySelector('[data-edit]').setAttribute('disabled', '');
        playerStats.curMana.subtract(this.skill.manaCost);
        this.start();
    }

    private start() {
        const calcDuration = () => this.skill.baseDuration * playerStats.skillDurationMultiplier.get();
        let time = calcDuration();
        let pct = 100;
        let duration = time;
        let loopId = -1;

        const changeId = playerStats.skillDurationMultiplier.onChange.listen(() => {
            duration = calcDuration();
            time = duration * (pct / 100);
        });

        modDB.add(this.skill.mods.flatMap(x => x.stats), this.skill.sourceName);

        const startLoops = () => {
            loopId = gameLoop.subscribe(dt => {
                if (time <= 0) {
                    gameLoop.unsubscribe(loopId);
                    stop();
                    return;
                }
                time -= dt;
                pct = Math.max(0, time / duration * 100);
                this.progressBar.style.width = `${pct}%`;
            });
        }

        const stop = () => {
            playerStats.skillDurationMultiplier.onChange.removeListener(changeId);
            modDB.removeBySource(this.skill.sourceName);
            this.running = false;
            this.element.querySelector('[data-edit]').removeAttribute('disabled');
        }
        startLoops();
        this.running = true;
    }

    private edit() {
        if (this.running) {
            return;
        }
        BuffSkillSlot.active = this;
        buffSkillModal.setAttribute('data-skill-name', this.skill?.name);
        buffSkillModal.querySelectorAll('ul[data-skill-list] [data-skill-name]').forEach(x => {
            const skillAttr = x.getAttribute('data-skill-name');
            const skill = buffSkills.find(x => x.name === skillAttr);
            x.toggleAttribute('disabled', buffSkillSlots.some(slot => slot.skill?.name === skill?.name));
            x.classList.toggle('hidden', skill?.levelReq > playerStats.level.get());
        });
        buffSkillModal.querySelector('[data-value="remove"]').classList.toggle('hidden', !this.skill);
        openModal(buffSkillModal);
    }

    private createElement() {
        const element = document.createElement('li');
        element.classList.add('g-field');
        element.setAttribute('data-skill-slot', 'buff-skill');
        const wrapper = document.createElement('div');
        wrapper.insertAdjacentHTML('beforeend', `<div class="g-progress-bar-background" data-progress-bar></div>`);
        wrapper.insertAdjacentHTML('beforeend', `<button class="g-button" data-label data-trigger></button>`);
        element.appendChild(wrapper);
        wrapper.insertAdjacentHTML('afterend', `<button class="g-button" data-edit>Edit</button>`);
        element.querySelector('[data-edit]').addEventListener('click', () => this.edit());
        wrapper.querySelector('[data-trigger]').addEventListener('click', () => this.trigger())
        buffSkillList.appendChild(element);
        return element;
    }
}
