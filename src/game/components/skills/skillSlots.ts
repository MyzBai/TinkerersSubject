import { StatModifier } from "@src/game/mods";
import { highlightHTMLElement } from "@src/utils/helpers";
import type { AttackSkill, BuffSkill, Skill } from "./Skills";
import type Skills from "./Skills";
import Game from '@src/game/Game';
import Player from '@src/game/Player';
import Statistics from "@src/game/Statistics";

export interface SkillSlot {
    readonly element: HTMLElement;
    readonly skill?: Skill;
    setSkill(skill?: Skill): void;
    readonly canEnable: boolean;
    readonly canTrigger: boolean;
    readonly canRemove: boolean;
    readonly canAutomate: boolean;
    trigger?: () => void;
}

export interface Triggerable {
    trigger: () => void;
}


export class AttackSkillSlot implements SkillSlot {
    readonly element: HTMLElement;
    private readonly progressBar: HTMLProgressElement;
    private _skill: AttackSkill;
    constructor(skills: Skills) {

        this.element = this.createElement();
        this.progressBar = this.element.querySelectorForce<HTMLProgressElement>('progress');

        skills.page.querySelectorForce('[data-attack-skill-slot]').appendChild(this.element);
        this._skill = skills.attackSkills[0]!;

        const saveData = Game.saveObj?.skills;
        const savedAttackSkillName = saveData?.attackSkillSlot?.name;
        const savedAttackSkill = savedAttackSkillName ? skills.attackSkills.find(x => x.name === savedAttackSkillName) : undefined;
        savedAttackSkill?.setRankByIndex(saveData?.attackSkillSlot?.rankIndex || 0);
        if (savedAttackSkill) {
            this.setSkill(savedAttackSkill);
        }

    }
    get canEnable() {
        return true;
    }
    get canTrigger() {
        return false;
    }
    get canRemove() {
        return false;
    }
    get canAutomate() {
        return false;
    }

    get skill() {
        return this._skill;
    }

    setSkill(skill: AttackSkill) {
        this.removeModifiers();
        this._skill = skill;
        this.element.querySelectorForce('[data-skill-name]').textContent = skill.rank.config.name || 'unknown';

        this.applyModifiers();
    }

    removeModifiers() {
        Player.modDB.removeBySource(this._skill?.sourceName);
    }
    applyModifiers() {
        Player.modDB.add([new StatModifier({ name: 'BaseDamageMultiplier', valueType: 'Base', value: this._skill.rank.config.baseDamageMultiplier })], this._skill.sourceName);
        Player.modDB.add([new StatModifier({ name: 'AttackSpeed', valueType: 'Base', value: this._skill.rank.config.attackSpeed })], this._skill.sourceName);
        Player.modDB.add([new StatModifier({ name: 'AttackManaCost', valueType: 'Base', value: this._skill.rank.config.manaCost || 0 })], this._skill.sourceName);

        Player.modDB.add(this._skill.rank.mods.flatMap(x => x.copy().stats), this._skill.sourceName);
    }

    updateProgressBar() {
        const pct = Player.attackTime / Player.attackWaitTime;
        this.progressBar.value = pct > 1 ? 0 : pct;
    }

    protected createElement() {
        const li = document.createElement('li');
        li.classList.add('s-skill-slot', 'g-list-item');
        li.setAttribute('data-tab-target', 'attack');
        li.insertAdjacentHTML('beforeend', '<div data-skill-name></div>');
        li.insertAdjacentHTML('beforeend', `<progress value="0" max="1"></progress>`);
        return li;
    }
}

export class BuffSkillSlot implements SkillSlot, Triggerable {
    readonly element: HTMLElement;
    private readonly progressBar: HTMLProgressElement;
    private _skill?: BuffSkill;
    private _automate = false;
    private _time = 0;
    private _duration = 0;
    private _running = false;
    private _cancelled = false;

    constructor(skills: Skills) {
        this.element = this.createElement();
        this.progressBar = this.element.querySelectorForce<HTMLProgressElement>('progress');
        this.setSkill(undefined);

        const savedSkillSlotData = Game.saveObj?.skills?.buffSkillSlotList?.find(x => x && x.index === skills.buffSkillSlots.length);
        if (savedSkillSlotData) {
            const skill = skills.buffSkills.find(x => x.firstRank!.config.name === savedSkillSlotData.name);
            if (skill) {
                this.setSkill(skill);
                this._time = savedSkillSlotData.time || 0;
                this._automate = savedSkillSlotData.automate || false;
                if (savedSkillSlotData.running) {
                    this.loop();
                } else {
                    this.tryTriggerLoop();
                }
            }
        }

        highlightHTMLElement(skills.menuItem, 'click');
        highlightHTMLElement(this.element, 'mouseover');
    }

    get canEnable() {
        return !this._running;
    }
    get canTrigger() {
        return !!this._skill && !this._running && this.sufficientMana;
    }
    get canRemove() {
        return !!this._skill && !this._running;
    }
    get canAutomate() {
        return !!this._skill;
    }
    get sufficientMana() {
        return Statistics.statistics["Current Mana"].get() > (this.skill?.rank.config.manaCost || 0);
    }
    get automate() {
        return this._automate;
    }
    get time() {
        return this._time;
    }
    get running() {
        return this._running;
    }

    get skill() {
        return this._skill;
    }

    setSkill(skill?: BuffSkill) {
        this._skill = skill;
        this._automate = false;
        this.element.querySelectorForce('[data-skill-name]').textContent = skill?.rank.config.name || '[Empty Slot]';
    }

    trigger() {
        if (!this._skill || !this.canTrigger) {
            return;
        }
        Statistics.statistics["Current Mana"].subtract(this._skill.rank.config.manaCost || 0);
        this.loop();
        return true;
    }

    toggleAutomate() {
        this._automate = !this._automate;
        if (this._automate && !this._running) {
            this.tryTriggerLoop();
        }
    }

    //Start
    private tryTriggerLoop() {
        if (!this.skill) {
            return;
        }
        const loopEval = () => {
            if(this._cancelled)
            if (!this._automate) {
                Statistics.statistics["Current Mana"].removeListener('change', loopEval);
                return;
            }
            if (this.canTrigger) {
                Statistics.statistics["Current Mana"].removeListener('change', loopEval);
                this.trigger();
            }
        };
        Statistics.statistics["Current Mana"].addListener('change', loopEval);
        loopEval();
    }
    //Loop
    private loop() {
        if (!this.skill) {
            return;
        }
        const calcDuration = (multiplier: number) => {
            const baseDuration = this.skill?.rank.config.baseDuration || 0;
            this._duration = baseDuration * multiplier;
        };

        calcDuration(Statistics.statistics["Skill Duration Multiplier"].get());
        this._time = this._time > 0 ? this._time : this._duration;
        this._running = true;
        this._cancelled = false;
        Statistics.statistics["Skill Duration Multiplier"].addListener('change', calcDuration);
        this.applyModifiers();
        const loopId = Game.gameLoop.subscribe((dt) => {
            if (!this.skill) {
                return;
            }

            if (this._time <= 0) {
                this._time = 0;
                Game.gameLoop.unsubscribe(loopId);
                Statistics.statistics["Skill Duration Multiplier"].removeListener('change', calcDuration);
                this.stop();
                return;
            }
            this._time -= dt;
        });
    }

    //End
    private stop() {
        if (!this._skill) {
            throw Error();
        }

        this.removeModifiers();
        this.progressBar.value = 0;

        this._running = false;
        if (this._automate) {
            this.tryTriggerLoop();
        }
    }

    cancel() {
        this._cancelled = true;
        this.stop();
    }

    private removeModifiers() {
        if (this._skill) {
            Player.modDB.removeBySource(this._skill.sourceName);
        }
    }
    private applyModifiers() {
        if (this._skill) {
            Player.modDB.add(this._skill.rank.mods.flatMap(x => x.copy().stats), this._skill.sourceName);
        }
    }

    updateProgressBar() {
        if (!this._running) {
            return;
        }
        this.progressBar.value = this._time / this._duration || 0;
    }

    protected createElement() {
        const li = document.createElement('li');
        li.classList.add('s-skill-slot', 'g-list-item');
        li.setAttribute('data-tab-target', 'buff');
        li.insertAdjacentHTML('beforeend', '<div data-skill-name></div>');
        li.insertAdjacentHTML('beforeend', `<progress class="small" value="0" max="1"></progress>`);
        return li;
    }

}