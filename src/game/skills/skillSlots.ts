import { queryHTML } from "@src/utils/helpers";
import { gameLoop } from "../game";
import { playerStats, modDB } from "../player";
import { AttackSkillModal, BuffSkillModal } from "./skillModal";
import { AttackSkill, BuffSkill, Skill } from "./skills";



export abstract class SkillSlot<T extends Skill> {
    public readonly element: HTMLElement;
    protected _skill?: T;
    constructor() {
        this.element = this.createElement();
    }
    get skill() { return this._skill; }
    set(skill: T | undefined) {
        this._skill = skill;
        const name = skill?.name || '[Empty]';
        this.element.setAttribute('data-skill-name', name);
        queryHTML('[data-label]', this.element).textContent = name;
    }
    protected abstract createElement(): HTMLElement;
}

export class AttackSkillSlot extends SkillSlot<AttackSkill> {
    private readonly skillSlotContainer = queryHTML('.p-game .s-player .s-skills [data-attack-skill]');
    private readonly modal: AttackSkillModal;
    readonly skills: AttackSkill[];
    constructor(attackSkills: AttackSkill[], modal: AttackSkillModal) {
        super();
        this.modal = modal;
        this.skillSlotContainer.appendChild(this.element);
        this.skills = attackSkills;
    }

    set(skill: AttackSkill) {
        super.set(skill);
        this._skill?.enable();
    }

    edit() {
        this.modal.open(this);
    }

    protected createElement() {
        const element = document.createElement('div');
        element.classList.add('g-field');
        element.setAttribute('data-skill-slot', 'attack-skill');
        element.insertAdjacentHTML('beforeend', `<div data-label></div>`);
        element.insertAdjacentHTML('beforeend', `<button class="g-button" data-edit>Edit</button>`);
        element.querySelector('button[data-edit]')!.addEventListener('click', () => this.edit());
        return element;
    }
}

export class BuffSkillSlot extends SkillSlot<BuffSkill> {
    private readonly buffSkillList = queryHTML<HTMLUListElement>('.p-game .s-player .s-skills ul[data-buff-skill-list]');
    private readonly progressBar: HTMLElement;
    readonly modal: BuffSkillModal;
    readonly skills: BuffSkill[];
    private running: boolean = false;

    constructor(skills: BuffSkill[], modal: BuffSkillModal) {
        super();
        this.buffSkillList.appendChild(this.element);
        this.progressBar = queryHTML('[data-progress-bar]', this.element);
        this.skills = skills;
        this.modal = modal;
        this.set(undefined);
    }

    private trigger() {
        if (!this._skill || this.running) {
            return;
        }
        const sufficientMana = playerStats.curMana.get() >= this._skill.manaCost;
        if (!sufficientMana) {
            return;
        }
        playerStats.curMana.subtract(this._skill.manaCost);
        this.start();
    }

    private start() {
        if (!this._skill) {
            return;
        }
        const calcDuration = () => this._skill?.baseDuration || 0 * playerStats.skillDurationMultiplier.get();
        let time = calcDuration();
        let pct = 100;
        let duration = time;
        let loopId = -1;
        const updateTime = () => {
            duration = calcDuration();
            time = duration * (pct / 100);
        };
        playerStats.skillDurationMultiplier.addListener('change', updateTime);

        modDB.add(this._skill.mods.flatMap(x => x.stats), this._skill.sourceName);

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
            playerStats.skillDurationMultiplier.removeListener('change', updateTime)
            if(this._skill){
                modDB.removeBySource(this._skill.sourceName);
            }
            this.running = false;
            this.progressBar.style.width = `0%`;
        }
        startLoops();
        this.running = true;
    }

    private edit() {
        this.modal.open(this);
    }

    protected createElement() {
        const element = document.createElement('li');
        element.classList.add('g-field');
        element.setAttribute('data-skill-slot', 'buff-skill');

        element.insertAdjacentHTML('beforeend', `
        <div class="wrapper">
            <div data-progress-bar></div>
            <div class="g-button" data-label></div>
        </div>`);
        element.insertAdjacentHTML('beforeend', `<button class="g-button" data-edit>Edit</button>`);
        queryHTML('[data-edit]', element).addEventListener('click', () => this.edit());
        queryHTML('[data-label]', element).addEventListener('click', () => this.trigger());
        return element;
    }
}
