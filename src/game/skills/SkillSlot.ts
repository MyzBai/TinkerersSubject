import { queryHTML } from "@src/utils/helpers";
import type Game from "../Game";
import type { AttackSkill, BuffSkill, Skill } from "./Skills";

export abstract class SkillSlot<T extends Skill> {
    public readonly element: HTMLElement;
    protected _skill?: T;
    constructor(readonly type: 'AttackSkill' | 'BuffSkill', readonly skills: Skill[]) {
        this.element = this.createElement();
    }
    get skill() { return this._skill; }
    get canEdit() { return true; }
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
    constructor(readonly game: Game, attackSkills: AttackSkill[]) {
        super('AttackSkill', attackSkills);
        this.skillSlotContainer.appendChild(this.element);
        const activeAttackSkill = attackSkills.find(x => x.name === game.saveObj.skills?.attackSkillName) || attackSkills[0];
        this.set(activeAttackSkill);
    }

    set(skill: AttackSkill) {
        super.set(skill);
        this._skill?.enable();
    }

    edit() {
        this.game.skills.editSkill(this);
    }

    protected createElement() {
        const element = document.createElement('div');
        element.classList.add('g-field');
        element.setAttribute('data-skill-slot', 'attack-skill');
        element.insertAdjacentHTML('beforeend', `<div data-label></div>`);
        element.insertAdjacentHTML('beforeend', `<button class="g-button" data-edit>Edit</button>`);
        queryHTML('button[data-edit]', element).addEventListener('click', () => this.edit());
        return element;
    }
}

export class BuffSkillSlot extends SkillSlot<BuffSkill> {
    private readonly buffSkillList = queryHTML<HTMLUListElement>('.p-game .s-player .s-skills ul[data-buff-skill-list]');
    private readonly progressBar: HTMLElement;
    private running = false;
    private _time = 0;
    constructor(readonly game: Game, readonly buffSkills: BuffSkill[], readonly index: number) {
        super('BuffSkill', buffSkills);
        this.buffSkillList.appendChild(this.element);
        this.progressBar = queryHTML('[data-progress-bar]', this.element);
        const savedSkillData = game.saveObj.skills?.buffSkills.find(x => x.index === index);
        if (savedSkillData) {
            const skill = buffSkills.find(x => x.name === savedSkillData.name);
            this.set(skill);
            if (savedSkillData.time > 0) {
                this._time = savedSkillData.time;
                console.log(this._time);
                this.start();
            }
        } else {
            this.set(undefined);
        }
    }
    get time() {
        return this._time;
    }

    get canEdit() {
        return !this.running;
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
        const startTime = calcDuration();
        if (this._time <= 0) {
            this._time = startTime;
        }
        const calcPct = () => {
            return Math.max(0, this._time / duration * 100);
        }
        let duration = startTime;
        let loopId: string;
        const updateTime = () => {
            duration = calcDuration();
            this._time = duration * (calcPct() / 100);
        };
        this.game.player.stats.skillDurationMultiplier.addListener('change', updateTime);
        this.game.player.modDB.add(this._skill.mods.flatMap(x => x.stats), this._skill.sourceName);

        const startLoops = () => {
            loopId = this.game.gameLoop.subscribe(dt => {
                if (this._time <= 0) {
                    this._time = 0;
                    this.game.gameLoop.unsubscribe(loopId);
                    stop();
                    return;
                }
                this._time -= dt;
                this.progressBar.style.width = `${calcPct()}%`;
            });
        }

        const stop = () => {
            this.game.player.stats.skillDurationMultiplier.removeListener('change', updateTime)
            if (this._skill) {
                this.game.player.modDB.removeBySource(this._skill.sourceName);
            }
            this.running = false;
            this.progressBar.style.width = `0%`;
            queryHTML<HTMLButtonElement>('[data-edit]', this.element).disabled = true;
        }
        startLoops();
        this.running = true;
    }

    private edit() {
        this.game.skills.editSkill(this);
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
        queryHTML('[data-label]', element).addEventListener('click', this.trigger.bind(this));
        return element;
    }
}
