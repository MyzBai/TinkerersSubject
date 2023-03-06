import { StatModifier } from "@src/game/mods";
import { highlightHTMLElement, querySelector } from "@src/utils/helpers";
import type { AttackSkill, BuffSkill, Skill } from "./Skills";
import type Skills from "./Skills";

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
    constructor(private skills: Skills) {

        this.element = this.createElement();
        this.progressBar = querySelector<HTMLProgressElement>('progress', this.element);

        this.rankProgressCallback = this.rankProgressCallback.bind(this);

        querySelector('[data-attack-skill-slot]', skills.page).appendChild(this.element);
        this._skill = skills.attackSkills[0]!;

        const saveData = skills.game.saveObj.skills;
        const savedAttackSkillName = saveData?.attackSkillSlot.name;
        const savedAttackSkill = skills.attackSkills.find(x => x.name === savedAttackSkillName);
        if (saveData) {
            savedAttackSkill?.setRankByIndex(saveData.attackSkillSlot.rankIndex || 0);
        }
        this.setSkill(savedAttackSkill || skills.attackSkills[0]!);

    }
    get canEnable() { return true; };
    get canTrigger() { return false; };
    get canRemove() { return false; };
    get canAutomate() { return false; };

    get skill() { return this._skill; }

    private rankProgressCallback() {
        if (!this.skill) {
            return;
        }
        const nextRank = this.skill.getNextRank();
        if (nextRank) {
            nextRank.incrementProgress();
            if(!this.skills.page.classList.contains('hidden') && this.skills.activeSkillSlot === this){
                this.skills.skillViewer.updateView();
            }
            if (nextRank.unlocked) {
                this.skills.game.statistics.statistics['Hits'].removeListener('add', this.rankProgressCallback);
                highlightHTMLElement(this.skills.menuItem, 'click');
                highlightHTMLElement(this.element, 'mouseover', true);
            }
        }
    }

    setSkill(skill: AttackSkill) {

        this.removeModifiers();
        this._skill = skill;
        querySelector('[data-skill-name]', this.element).textContent = skill.rank.config.name || 'unknown';

        this.skills.game.statistics.statistics['Hits'].removeListener('add', this.rankProgressCallback);
        const nextRank = skill.getNextRank();
        if (nextRank) {
            this.skills.game.statistics.statistics['Hits'].addListener('add', this.rankProgressCallback);
        }
        this.applyModifiers();
    }

    removeModifiers() {
        this.skills.game.player.modDB.removeBySource(this._skill.sourceName);
    }
    applyModifiers() {
        this.skills.game.player.modDB.add([new StatModifier({ name: 'BaseDamageMultiplier', valueType: 'Base', value: this._skill.rank.config.baseDamageMultiplier })], this._skill.sourceName);
        this.skills.game.player.modDB.add([new StatModifier({ name: 'AttackSpeed', valueType: 'Base', value: this._skill.rank.config.attackSpeed })], this._skill.sourceName);
        this.skills.game.player.modDB.add([new StatModifier({ name: 'AttackManaCost', valueType: 'Base', value: this._skill.rank.config.manaCost || 0 })], this._skill.sourceName);

        this.skills.game.player.modDB.add(this._skill.rank.mods.flatMap(x => x.copy().stats), this._skill.sourceName);
    }

    updateProgressBar(attackProgressPct: number) {
        this.progressBar.value = attackProgressPct > 1 ? 0 : attackProgressPct;
    }

    protected createElement() {
        const li = document.createElement('li');
        li.classList.add('s-skill-slot', 'g-list-item');
        li.setAttribute('data-tab-target', 'attack');
        li.insertAdjacentHTML('beforeend', '<div data-skill-name></div>');

        {
            const progressBar = document.createElement('progress');
            progressBar.max = 1;
            progressBar.value = 0;

            li.appendChild(progressBar);
        }
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
        this.progressBar = querySelector<HTMLProgressElement>('progress', this.element);
        this.setSkill(undefined);

        const savedSkillSlotData = skills.game.saveObj.skills?.buffSkillSlotList.find(x => x.index === skills.buffSkillSlots.length);
        if (savedSkillSlotData) {
            const skill = skills.buffSkills.find(x => x.firstRank!.config.name === savedSkillSlotData.name);
            if (skill) {
                this.setSkill(skill);
                this._time = savedSkillSlotData.time;
                this._automate = savedSkillSlotData.automate;
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

    get canEnable() { return !this._running; };
    get canTrigger() { return !!this._skill && !this._running && this.sufficientMana; };
    get canRemove() { return !!this._skill && !this._running; };
    get canAutomate() { return !!this._skill };
    get sufficientMana() { return this.skills.game.statistics.statistics["Current Mana"].get() > (this.skill?.rank.config.manaCost || 0); }
    get automate() { return this._automate; }
    get time() { return this._time; }
    get running() { return this._running; }

    get skill() { return this._skill; }

    setSkill(skill?: BuffSkill) {
        this._skill = skill;
        this._automate = false;
        querySelector('[data-skill-name]', this.element).textContent = skill?.rank.config.name || '[Empty Slot]';
    }

    trigger() {
        if (!this._skill || !this.canTrigger) {
            return;
        }
        const nextRank = this._skill?.getNextRank();
        if (nextRank) {
            nextRank.incrementProgress();
            if(!this.skills.page.classList.contains('hidden') && this.skills.activeSkillSlot === this){
                this.skills.skillViewer.updateView();
            }
            if (nextRank.unlocked) {
                highlightHTMLElement(this.skills.menuItem, 'click');
                highlightHTMLElement(this.element, 'mouseover', true);
            }
        }
        this.skills.game.statistics.statistics["Current Mana"].subtract(this._skill.rank.config.manaCost || 0);
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
    tryTriggerLoop() {
        if (!this.skill) {
            return;
        }
        const loopEval = () => {
            if (!this._automate) {
                this.skills.game.statistics.statistics["Current Mana"].removeListener('change', loopEval);
                return;
            }
            if (this.trigger()) {
                this.skills.game.statistics.statistics["Current Mana"].removeListener('change', loopEval);
            }
        };
        this.skills.game.statistics.statistics["Current Mana"].addListener('change', loopEval);
        loopEval();
    }
    //Loop
    loop() {
        if (!this.skill) {
            return;
        }
        const calcDuration = (multiplier: number) => {
            const baseDuration = this.skill?.rank.config.baseDuration || 0;
            this._duration = baseDuration * multiplier;
        };

        calcDuration(this.skills.game.statistics.statistics["Skill Duration Multiplier"].get());
        this._time = this._time > 0 ? this._time : this._duration;
        this._running = true;
        this.skills.game.statistics.statistics["Skill Duration Multiplier"].addListener('change', calcDuration);
        this.applyModifiers();
        const loopId = this.skills.game.gameLoop.subscribe((dt) => {
            if (!this.skill) {
                return;
            }

            // this._time = this._duration * (this._time / this._duration);

            if (this._time <= 0) {
                this._time = 0;
                this.skills.game.gameLoop.unsubscribe(loopId);
                this.skills.game.statistics.statistics["Skill Duration Multiplier"].removeListener('change', calcDuration);
                this.stop();
                return;
            }
            this._time -= dt;
        });
    }

    //End
    stop() {
        if (!this.skill) {
            throw Error();
        }

        this.skills.game.player.modDB.removeBySource(this.skill.sourceName);
        this.progressBar.value = 0;

        this._running = false;
        if (this._automate) {
            this.tryTriggerLoop();
        }

        if (!this.skills.page.classList.contains('hidden') && this === this.skills.activeSkillSlot) {
            this.skills.skillViewer.updateView();
        }
    }

    removeModifiers() {
        if (this._skill) {
            this.skills.game.player.modDB.removeBySource(this._skill.sourceName);
        }
    }
    applyModifiers() {
        if (this._skill) {
            this.skills.game.player.modDB.add(this._skill.rank.mods.flatMap(x => x.copy().stats), this._skill.sourceName);
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

        {
            const progressBar = document.createElement('progress');
            progressBar.max = 1;
            progressBar.value = 0;

            li.appendChild(progressBar);
        }
        return li;
    }

}