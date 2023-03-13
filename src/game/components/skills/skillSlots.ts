import { StatModifier } from "@src/game/mods";
import { highlightHTMLElement } from "@src/utils/helpers";
import type { AttackSkill, BuffSkill, Skill } from "./Skills";
import type Skills from "./Skills";
import Game from '@src/game/Game';
import Player from '@src/game/Player';

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
        Player.modDB.add(this._skill.sourceName, ...[new StatModifier({ name: 'BaseDamageMultiplier', valueType: 'Base', value: this._skill.rank.config.baseDamageMultiplier })]);
        Player.modDB.add(this._skill.sourceName, ...[new StatModifier({ name: 'AttackSpeed', valueType: 'Base', value: this._skill.rank.config.attackSpeed })]);
        Player.modDB.add(this._skill.sourceName, ...[new StatModifier({ name: 'AttackManaCost', valueType: 'Base', value: this._skill.rank.config.manaCost || 0 })]);

        Player.modDB.add(this._skill.sourceName, ...this._skill.rank.mods.flatMap(x => x.copy().stats));
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

    constructor(private readonly skills: Skills) {
        this.element = this.createElement();
        this.progressBar = this.element.querySelectorForce<HTMLProgressElement>('progress');
        this.setSkill(undefined);

        const savedSlots = Game.saveObj?.skills?.buffSkillSlotList;
        if (savedSlots) {
            const savedSlot = savedSlots.find(x => x?.index === skills.buffSkillSlots.length);
            if (savedSlot) {
                const skill = skills.buffSkills.find(x => x.name === savedSlot.name);
                if (skill) {
                    skill.setRankByIndex(savedSlot.rankIndex || 0);
                    this.setSkill(skill);
                    this._time = savedSlot.time || 0;
                    this._automate = savedSlot.automate || false;
                    if (savedSlot.running) {
                        this.loop();
                    } else {
                        this.tryTriggerLoop();
                    }

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
        return Player.stats["Current Mana"].get() > (this.skill?.rank.config.manaCost || 0);
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
        Player.stats["Current Mana"].subtract(this._skill.rank.config.manaCost || 0);
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
            if (!this._automate) {
                Player.stats["Current Mana"].removeListener('change', loopEval);
                return;
            }
            if (this.canTrigger) {
                Player.stats["Current Mana"].removeListener('change', loopEval);
                this.trigger();
            }
        };
        Player.stats["Current Mana"].addListener('change', loopEval);
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

        calcDuration(Player.stats["Skill Duration Multiplier"].get());
        this._time = this._time > 0 ? this._time : this._duration;
        this._running = true;
        Player.stats["Skill Duration Multiplier"].addListener('change', calcDuration);
        this.applyModifiers();
        const loopId = Game.gameLoop.subscribe((dt) => {
            if (!this.skill) {
                return;
            }

            if (this._time <= 0 || !this._running) {
                this._time = 0;
                Game.gameLoop.unsubscribe(loopId);
                Player.stats["Skill Duration Multiplier"].removeListener('change', calcDuration);
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

        if (this === this.skills.activeSkillSlot) {
            this.skills.skillViewer.createView(this._skill);
        }
    }

    cancel() {
        this._running = false;
    }

    private removeModifiers() {
        if (this._skill) {
            Player.modDB.removeBySource(this._skill.sourceName);
        }
    }
    private applyModifiers() {
        if (this._skill) {
            Player.modDB.add(this._skill.sourceName, ...this._skill.rank.mods.flatMap(x => x.copy().stats));
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