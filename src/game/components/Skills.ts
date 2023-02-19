import GConfig from "@src/types/gconfig";
import { Save } from "@src/types/save";
import { clamp, queryHTML } from "@src/utils/helpers";
import Loop from "@src/utils/Loop";
import Game from "../Game";
import { ModDB, Modifier, StatModifier } from "../mods";
import Player from "../Player";
import Component from "./Component";

type SkillsData = Required<Required<GConfig>['components']>['skills'];
type AttackSkillData = SkillsData['attackSkills']['skillList'][number];
type BuffSkillData = Required<SkillsData>['buffSkills']['skillList'][number];

type SkillSlot = AttackSkillSlot | BuffSkillSlot;

export default class Skills extends Component {
    activeSkillSlot: BaseSkillSlot;
    private activeSkill?: BaseSkill;
    private readonly attackSkillSlot: AttackSkillSlot;
    private readonly buffSkillSlots: BuffSkillSlot[] = [];

    constructor(readonly game: Game, readonly data: SkillsData) {
        super(game, 'skills');

        // //setup attack skills
        {
            const attackSkills = [...data.attackSkills.skillList.sort((a, b) => a.levelReq - b.levelReq)].map<AttackSkill>(x => new AttackSkill(this, x));
            this.attackSkillSlot = new AttackSkillSlot();
            this.activeSkillSlot = this.attackSkillSlot;
            this.attackSkillSlot.setSkill(attackSkills[0]);
            this.attackSkillSlot.slotLabelElement.addEventListener('click', () => {
                this.selectSkillSlot(this.attackSkillSlot, attackSkills);
            });

            game.gameLoop.subscribeAnim(() => {
                if (this.page.classList.contains('hidden')) {
                    return;
                }
                this.attackSkillSlot.updateProgressBar(this.game.player.attackProgressPct);
            });
            queryHTML('[data-attack-skill-slot]', this.page).replaceChildren(this.attackSkillSlot.element!);
            queryHTML('[data-skill-name]', this.attackSkillSlot.element).click();
        }

        //setup buff skills
        {
            const buffSkillSlotContainer = queryHTML('.s-skill-slots [data-buff-skill-slots]', this.page);
            buffSkillSlotContainer.replaceChildren();
            if (data.buffSkills) {
                const buffSkills = [...data.buffSkills.skillList.sort((a, b) => a.levelReq - b.levelReq)].map<BuffSkill>(x => new BuffSkill(x));
                for (const buffSkillData of data.buffSkills.skillSlots || []) {
                    game.player.stats.level.registerCallback(buffSkillData.levelReq, () => {
                        const slot = new BuffSkillSlot(this);
                        slot.slotLabelElement.addEventListener('click', () => {
                            this.selectSkillSlot(slot, buffSkills);
                        });
                        buffSkillSlotContainer.appendChild(slot.element!);
                        this.buffSkillSlots.push(slot);
                    });
                }
            }
        }

        {
            const skillInfoContainer = queryHTML('[data-skill-info]', this.page);
            queryHTML('[data-enable]', skillInfoContainer).addEventListener('click', () => {
                if (this.activeSkill) {
                    this.enableSkill(this.activeSkillSlot, this.activeSkill);
                }
            });
            queryHTML('[data-remove]', skillInfoContainer).addEventListener('click', () => this.removeSkillFromSlot(this.activeSkillSlot as BuffSkillSlot));
            queryHTML('[data-trigger]', skillInfoContainer).addEventListener('click', () => this.triggerSkill(this.activeSkillSlot as BuffSkillSlot));
            queryHTML('[data-automate]', skillInfoContainer).addEventListener('click', () => this.toggleAutoMode(this.activeSkillSlot as BuffSkillSlot));
        }

    }

    updateUI(): void {
        this.attackSkillSlot.updateProgressBar(this.game.player.attackProgressPct);
        this.buffSkillSlots.forEach(x => x.updateProgressBar());
    }

    selectSkillSlot(skillSlot: SkillSlot, skillList: BaseSkill[]) {

        this.activeSkillSlot = skillSlot;
        [this.attackSkillSlot, ...this.buffSkillSlots].forEach(slot => slot.slotLabelElement.classList.toggle('selected', slot === skillSlot));
        this.populateSkillList(skillSlot, skillList);
    }


    private populateSkillList(skillSlot: SkillSlot, skillList: BaseSkill[]) {
        const skillListContainer = queryHTML('.p-game .p-skills .s-skill-list ul', this.page);
        const elements: HTMLLIElement[] = [];
        for (const skill of skillList) {
            const li = document.createElement('li');
            li.classList.add('g-list-item');
            li.classList.toggle('selected', skill.data.name === skillSlot.skill?.data.name);
            li.setAttribute('data-name', skill.data.name);
            li.textContent = skill.data.name;
            li.addEventListener('click', () => {
                this.activeSkill = skill;
                this.showSkill(skill);
                elements.forEach(x => x.classList.toggle('selected', x === li));
            });
            elements.push(li);
        }
        skillListContainer.replaceChildren(...elements);

        if (elements.length === 0) {
            skillListContainer.textContent = 'No skills available';
            return;
        }

        if (skillSlot.skill) {
            elements.find(x => x.getAttribute('data-name') === skillSlot.skill?.data.name)?.click();
        } else {
            elements[0].click();
        }

    }

    showSkill(skill: BaseSkill) {
        const skillInfoContainer = queryHTML('[data-skill-info]', this.page);
        const createTableRow = (label: string, value: string) => {
            const row = document.createElement('tr');
            row.insertAdjacentHTML('beforeend', `<td>${label}</td>`);
            row.insertAdjacentHTML('beforeend', `<td>${value}</td>`);
            return row;
        };

        queryHTML('header .title', skillInfoContainer).textContent = skill.data.name;

        const table = queryHTML('table', skillInfoContainer);
        table.replaceChildren();
        table.appendChild(createTableRow('Mana Cost', skill.data.manaCost.toFixed()));

        if (skill instanceof AttackSkill) {
            table.appendChild(createTableRow('Attack Speed', skill.data.attackSpeed.toFixed(2)));
            table.appendChild(createTableRow('Base Damage', skill.data.baseDamageMultiplier.toFixed() + '%'));
        } else if (skill instanceof BuffSkill) {
            table.appendChild(createTableRow('Duration', skill.data.baseDuration.toFixed() + 's'));
        }

        if (skill.data.mods) {
            const modElements: HTMLElement[] = [];
            for (const mod of skill.mods) {
                const modElement = document.createElement('div');
                modElement.classList.add('g-mod-desc');
                modElement.textContent = mod.desc;
                modElements.push(modElement);
            }
            for (let i = 0; i < 20; i++) {
                const modElement = document.createElement('div');
                modElement.classList.add('g-mod-desc');
                modElement.textContent = skill.mods[0].desc;
                modElements.push(modElement);

            }
            queryHTML('.s-mods', skillInfoContainer).replaceChildren(...modElements);
        }

        const enableButton = queryHTML<HTMLButtonElement>('[data-skill-info] [data-enable]', this.page);
        const removeButton = queryHTML<HTMLButtonElement>('[data-skill-info] [data-remove]', this.page);
        const triggerButton = queryHTML<HTMLButtonElement>('[data-skill-info] [data-trigger]', this.page);
        const automateButton = queryHTML<HTMLButtonElement>('[data-skill-info] [data-automate]', this.page);

        removeButton.classList.toggle('hidden', skill instanceof AttackSkill);
        triggerButton.classList.toggle('hidden', skill instanceof AttackSkill);
        automateButton.classList.toggle('hidden', skill instanceof AttackSkill);

        enableButton.disabled = !this.activeSkillSlot.canEnable || [this.attackSkillSlot, ...this.buffSkillSlots].some(x => x.skill === skill);
        if (skill instanceof BuffSkill && this.activeSkillSlot instanceof BuffSkillSlot && this.activeSkillSlot.skill === skill) {
            removeButton.disabled = !this.activeSkillSlot.canRemove;
            triggerButton.disabled = !this.activeSkillSlot.canTrigger;
            automateButton.disabled = !this.activeSkillSlot.canAutomate;

            const automate = this.activeSkillSlot.automate;
            automateButton.setAttribute('data-role', automate ? 'confirm' : 'cancel');
        } else {
            removeButton.disabled = true;
            triggerButton.disabled = true;
            automateButton.disabled = true;
        }
    }

    private enableSkill(skillSlot: BaseSkillSlot, skill: BaseSkill) {
        skillSlot.setSkill(skill);
        this.showSkill(skill);
    }

    private triggerSkill(skillSlot: BuffSkillSlot) {
        skillSlot.trigger();
        if (skillSlot.skill) {
            this.showSkill(skillSlot.skill);
        }
    }

    private removeSkillFromSlot(skillSlot: BuffSkillSlot) {
        skillSlot.setSkill(undefined);
        if (this.activeSkill) {
            this.showSkill(this.activeSkill);
        }
    }

    private toggleAutoMode(skillSlot: BuffSkillSlot) {
        skillSlot.toggleAutomate();
        if (skillSlot.skill) {
            this.showSkill(skillSlot.skill);
        }
    }


    save(saveObj: Save) {
        // saveObj.skills = {
        //     attackSkillName: this.attackSkillSlot?.skill?.name || 'invalid name',
        //     buffSkills: this.buffSkillSlots.filter(x => x.skill).map(x => {
        //         return {
        //             name: x.skill!.name,
        //             time: x.time,
        //             index: x.index
        //         };
        //     })
        // }
    }
}

class BaseSkillSlot {
    readonly element: HTMLElement;
    skill?: BaseSkill;
    readonly progressBar: HTMLProgressElement;
    constructor() {
        this.element = this.createElement();
        this.progressBar = queryHTML<HTMLProgressElement>('progress', this.element);
    }

    setSkill(skill?: BaseSkill) {
        this.skill = skill;
        queryHTML('[data-skill-name]', this.element).textContent = skill?.data.name || '[Empty Slot]';
    }
    get hasSkill() { return typeof this.skill !== 'undefined'; }
    get canRemove() { return this.hasSkill }
    get slotLabelElement() { return queryHTML('[data-skill-name]', this.element); }
    get canTrigger() { return false; }
    get canEnable() { return false; }

    protected createElement() {
        const li = document.createElement('li');
        li.classList.add('s-skill-slot');
        li.insertAdjacentHTML('beforeend', '<div class="g-list-item" data-skill-name></div>');

        {
            const progressBar = document.createElement('progress');
            progressBar.max = 1;
            progressBar.value = 0;

            li.appendChild(progressBar);
        }
        return li;
    }
}

class AttackSkillSlot extends BaseSkillSlot {
    constructor() {
        super();
    }
    get canEnable() { return true; }

    setSkill(skill: AttackSkill) {
        this.skill?.removeModifiers();
        super.setSkill(skill);
        skill.applyModifiers();
    }

    updateProgressBar(attackProgressPct: number) {
        this.progressBar.value = attackProgressPct;
    }
}

class BuffSkillSlot extends BaseSkillSlot {
    private _running = false;
    private _time = 0;
    private loopId?: string;
    private _automate = false;
    private readonly player: Player;
    private readonly gameLoop: Loop
    constructor(readonly skills: Skills) {
        super();
        this.setSkill(undefined);
        this.player = skills.game.player;
        this.gameLoop = skills.game.gameLoop;
    }
    get canEnable() {
        return !this.running;
    }
    get canRemove() {
        return this.hasSkill && !this._running;
    }
    get canTrigger() {
        return this.hasSkill && !this.automate && !this._running;
    }
    get canAutomate() {
        return this.hasSkill;
    }
    get automate() {
        return this._automate;
    }
    set automate(v: boolean) {
        this._automate = v;
    }

    get running() { return this._running; }
    get time() { return this._time; }

    toggleAutomate() {
        this._automate = !this._automate;
    }

    setSkill(skill?: BuffSkill) {
        this.skill = skill;
        queryHTML('[data-skill-name]', this.element).textContent = this.skill?.data.name || '[Empty Slot]';
    }

    updateProgressBar() {

    }

    trigger(startNew = true) {
        const skill = (this.skill as BuffSkill | undefined);
        if (!skill) {
            return;
        }
        const sufficientMana = this.player.stats.curMana.get() >= skill.data.manaCost;
        if (!sufficientMana) {
            return;
        }

        this.player.stats.curMana.subtract(skill.data.manaCost);

        const calcDuration = () => {
            const baseDuration = (this.skill as BuffSkill | undefined)?.data.baseDuration || 0;
            return baseDuration * this.player.stats.skillDurationMultiplier.get();
        };
        const calcPct = () => {
            return this._time / duration;
        };
        const updateTime = () => {
            duration = calcDuration();
            this._time = duration * calcPct();
        };

        if (this.loopId) {
            this.player.game.gameLoop.unsubscribe(this.loopId);
        }

        const startTime = calcDuration();
        if (startNew || this._time <= 0) {
            this._time = startTime;
        }
        let duration = startTime;

        this.player.modDB.add(skill.mods.flatMap(x => x.stats), skill.sourceName);

        this._running = true;
        console.log('start');
        this.loopId = this.gameLoop.subscribe(dt => {

            updateTime();

            if (this._time <= 0) {
                this._time = 0;

                if (this.skill) {
                    this.player.modDB.removeBySource(this.skill.sourceName);
                }
                this._running = false;
                if (this.automate) {
                    this.trigger();
                    return;
                }
                if (this.skills.activeSkillSlot === this && this.skill) {
                    this.skills.showSkill(this.skill);
                }
                this.gameLoop.unsubscribe(this.loopId);
                return;
            }
            this._time -= dt;
            this.progressBar.value = calcPct();
        });
    }
}

abstract class BaseSkill {
    protected readonly _mods: Modifier[];
    constructor(readonly data: AttackSkillData | BuffSkillData) {
        this._mods = data.mods?.map(x => new Modifier(x)) || [];
    }
    get sourceName() {
        return `Skill/${this.data.name || '[error]'}`;
    }
    get mods() { return this._mods; }


    abstract removeModifiers(): void;
    abstract applyModifiers(): void;
}

class AttackSkill extends BaseSkill {
    constructor(readonly skills: Skills, readonly data: AttackSkillData) {
        super(data);
    }

    removeModifiers() {
        this.skills.game.player.modDB.removeBySource(this.sourceName);
    }

    applyModifiers() {
        const source = `Skill/${this.data.name}`;

        this.skills.game.player.modDB.removeBySource(source);

        this.skills.game.player.modDB.add([new StatModifier({ name: 'BaseDamageMultiplier', valueType: 'Base', value: this.data.baseDamageMultiplier })], this.sourceName);
        this.skills.game.player.modDB.add([new StatModifier({ name: 'AttackSpeed', valueType: 'Base', value: this.data.attackSpeed })], this.sourceName);
        this.skills.game.player.modDB.add([new StatModifier({ name: 'AttackManaCost', valueType: 'Base', value: this.data.manaCost })], this.sourceName);

        this.mods.forEach(x => this.skills.game.player.modDB.add(x.stats, this.sourceName));
    }
}

class BuffSkill extends BaseSkill {
    constructor(readonly data: BuffSkillData) {
        super(data);
    }


    applyModifiers(): void {

    }

    removeModifiers(): void {

    }
}