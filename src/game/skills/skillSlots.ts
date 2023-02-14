import { queryHTML } from "@src/utils/helpers";
import { Modal } from "./skillModal";
import type Game from "../game";
import type { AttackSkill, BuffSkill, Skill } from "./skills";

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
    constructor(readonly game: Game, readonly attackSkills: AttackSkill[]) {
        super();
        this.skillSlotContainer.appendChild(this.element);
        this.set(attackSkills[0]);
    }

    set(skill: AttackSkill) {
        super.set(skill);
        this._skill?.enable();
    }

    edit() {
        const skillList = this.attackSkills.filter(x => x.levelReq <= this.game.player.stats.level.get());
        console.log(skillList);
        this.game.skills.modal.open({ canRemove: false, skills: skillList, skillSlot: this });
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
    readonly skills: BuffSkill[];
    private running: boolean = false;

    constructor(readonly game: Game, readonly buffSkills: BuffSkill[]) {
        super();
        this.buffSkillList.appendChild(this.element);
        this.progressBar = queryHTML('[data-progress-bar]', this.element);
        this.skills = game.skills.buffSkills;
        this.set(undefined);
    }

    private trigger() {
        if (!this._skill || this.running) {
            return;
        }
        const sufficientMana = this.game.player.stats.curMana.get() >= this._skill.manaCost;
        if (!sufficientMana) {
            return;
        }
        this.game.player.stats.curMana.subtract(this._skill.manaCost);
        this.start();
    }

    private start() {
        if (!this._skill) {
            return;
        }
        const calcDuration = () => this._skill?.baseDuration || 0 * this.game.player.stats.skillDurationMultiplier.get();
        let time = calcDuration();
        let pct = 100;
        let duration = time;
        let loopId: string;
        const updateTime = () => {
            duration = calcDuration();
            time = duration * (pct / 100);
        };
        this.game.player.stats.skillDurationMultiplier.addListener('change', updateTime);

        this.game.player.modDB.add(this._skill.mods.flatMap(x => x.stats), this._skill.sourceName);

        const startLoops = () => {
            loopId = this.game.gameLoop.subscribe(dt => {
                if (time <= 0) {
                    this.game.gameLoop.unsubscribe(loopId);
                    stop();
                    return;
                }
                time -= dt;
                pct = Math.max(0, time / duration * 100);
                this.progressBar.style.width = `${pct}%`;
            });
        }

        const stop = () => {
            this.game.player.stats.skillDurationMultiplier.removeListener('change', updateTime)
            if (this._skill) {
                this.game.player.modDB.removeBySource(this._skill.sourceName);
            }
            this.running = false;
            this.progressBar.style.width = `0%`;
        }
        startLoops();
        this.running = true;
    }

    private edit() {
        const skillList = this.buffSkills.filter(x => x.levelReq > this.game.player.stats.level.get());
        this.game.skills.modal.open({ canRemove: true, skills: skillList, skillSlot: this });
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
