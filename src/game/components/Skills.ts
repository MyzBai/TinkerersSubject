import GConfig from "@src/types/gconfig";
import { Save } from "@src/types/save";
import { highlightHTMLElement, querySelector, registerTabs } from "@src/utils/helpers";
import Game from "../Game";
import { Modifier, StatModifier } from "../mods";
import Player from "../Player";
import Component from "./Component";

type SkillsData = Required<Required<GConfig>['components']>['skills'];
type AttackSkillData = SkillsData['attackSkills']['skillList'][number];
type BuffSkillData = Required<SkillsData>['buffSkills']['skillList'][number];

type SkillSlot = AttackSkillSlot | BuffSkillSlot;

export default class Skills extends Component {
    activeSkillSlot: BaseSkillSlot;
    private activeSkill?: BaseSkill;
    readonly attackSkills: AttackSkill[] = [];
    private readonly attackSkillSlot: AttackSkillSlot;
    readonly buffSkillSlots: BuffSkillSlot[] = [];
    readonly buffSkills: BuffSkill[] = [];
    constructor(readonly game: Game, readonly data: SkillsData) {
        super(game, 'skills');

        registerTabs(querySelector('.s-skill-slots', this.page), querySelector('.s-skill-list'));
        registerTabs(querySelector('.s-skill-list', this.page), undefined, undefined, '[data-name]');

        // //setup attack skills
        {
            this.attackSkills = [...this.data.attackSkills.skillList.sort((a, b) => a.levelReq - b.levelReq)].map<AttackSkill>(x => new AttackSkill(this, x));
            this.attackSkillSlot = new AttackSkillSlot(this);
            this.activeSkillSlot = this.attackSkillSlot;
            this.attackSkillSlot.element.setAttribute('data-tab-target', 'attack');
            this.attackSkillSlot.element.addEventListener('click', () => {
                this.activeSkillSlot = this.attackSkillSlot;
                this.selectSkillListItem(querySelector('[data-attack-skill-list]', this.page), this.activeSkillSlot.skill);
            });
            querySelector('[data-attack-skill-slot]', this.page).replaceChildren(this.attackSkillSlot.element!);
            setTimeout(() => {
                this.attackSkillSlot.element.click();
            }, 10);

            for (const skill of this.attackSkills) {
                game.player.stats.level.registerCallback(skill.data.levelReq, () => {
                    this.addSkillListItem(skill, querySelector('[data-attack-skill-list]'));
                });
            }
        }

        //setup buff skills
        {
            const buffSkillSlotContainer = querySelector('.s-skill-slots [data-buff-skill-slots]', this.page);
            buffSkillSlotContainer.replaceChildren();
            if (data.buffSkills) {
                this.buffSkills = [...data.buffSkills.skillList.sort((a, b) => a.levelReq - b.levelReq)].map<BuffSkill>(x => new BuffSkill(this, x));
                for (const buffSkillData of data.buffSkills.skillSlots || []) {
                    game.player.stats.level.registerCallback(buffSkillData.levelReq, () => {
                        const slot = new BuffSkillSlot(this);
                        slot.element.addEventListener('click', () => {
                            this.activeSkillSlot = slot;
                            setTimeout(() => {
                                this.selectSkillListItem(querySelector('[data-buff-skill-list]', this.page), this.activeSkillSlot.skill);

                            }, 10);
                        });
                        slot.element.setAttribute('data-tab-target', 'buff');
                        buffSkillSlotContainer.appendChild(slot.element!);
                        this.buffSkillSlots.push(slot);
                    });
                }

                for (const skill of this.buffSkills) {
                    game.player.stats.level.registerCallback(skill.data.levelReq, () => {
                        this.addSkillListItem(skill, querySelector('[data-buff-skill-list]'));
                    });
                }

            }
        }

        //setup skill info
        {
            const skillInfoContainer = querySelector('[data-skill-info]', this.page);
            querySelector('[data-enable]', skillInfoContainer).addEventListener('click', () => {
                if (this.activeSkill) {
                    this.enableSkill(this.activeSkillSlot, this.activeSkill);
                }
            });
            const triggerButton = querySelector<HTMLButtonElement>('[data-trigger]', skillInfoContainer);
            const removeButton = querySelector<HTMLButtonElement>('[data-remove]', skillInfoContainer);
            const automateButton = querySelector<HTMLButtonElement>('[data-automate]', skillInfoContainer);
            removeButton.addEventListener('click', () => this.removeSkillFromSlot(this.activeSkillSlot as BuffSkillSlot));
            triggerButton.addEventListener('click', () => this.triggerSkill(this.activeSkillSlot as BuffSkillSlot));
            automateButton.addEventListener('click', () => this.toggleAutoMode(this.activeSkillSlot as BuffSkillSlot));

            if (this.data.buffSkills) {
                this.game.visiblityObserver.registerLoop(this.page, visible => {
                    if (visible) {
                        triggerButton.disabled = !this.activeSkillSlot.canTrigger;
                        removeButton.disabled = !this.activeSkillSlot.canRemove;
                    }
                }, { intervalMilliseconds: 100 });
            }
        }

        this.game.visiblityObserver.registerLoop(this.page, visible => {
            if (visible) {
                this.attackSkillSlot.updateProgressBar(this.game.player.attackProgressPct);
                for (const buffSkillSlot of this.buffSkillSlots) {
                    buffSkillSlot.updateProgressBar();
                }
            }
        });
    }

    private selectSkillListItem(container: HTMLElement, skill: BaseSkill | undefined) {
        const skillInfoContainer = querySelector('[data-skill-info]');
        skillInfoContainer.classList.remove('hidden');
        if (skill) {
            const listItem = container.querySelector<HTMLElement>(`[data-name="${skill.data.name}"]`);
            listItem?.click();
            this.showSkill(skill);
        } else {
            const element = container.querySelector<HTMLElement>('[data-name]');
            if (!element) {
                skillInfoContainer.classList.add('hidden');
            } else {
                element.click();
            }
        }
    }

    private addSkillListItem(skill: BaseSkill, container: HTMLElement) {
        const li = document.createElement('li');
        li.classList.add('g-list-item');
        li.setAttribute('data-name', skill.data.name);
        li.textContent = skill.data.name;
        li.addEventListener('click', () => {
            this.activeSkill = skill;
            this.showSkill(skill);
        });
        highlightHTMLElement(li, 'mouseover');
        container.appendChild(li);
    }

    showSkill(skill: BaseSkill) {
        const skillInfoContainer = querySelector('[data-skill-info]', this.page);
        const createTableRow = (label: string, value: string) => {
            const row = document.createElement('tr');
            row.insertAdjacentHTML('beforeend', `<td>${label}</td>`);
            row.insertAdjacentHTML('beforeend', `<td>${value}</td>`);
            return row;
        };

        querySelector('header .title', skillInfoContainer).textContent = skill.data.name;

        const table = querySelector('table', skillInfoContainer);
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
            querySelector('.s-mods', skillInfoContainer).replaceChildren(...modElements);
        }

        const enableButton = querySelector<HTMLButtonElement>('[data-skill-info] [data-enable]', this.page);
        const removeButton = querySelector<HTMLButtonElement>('[data-skill-info] [data-remove]', this.page);
        const triggerButton = querySelector<HTMLButtonElement>('[data-skill-info] [data-trigger]', this.page);
        const automateButton = querySelector<HTMLButtonElement>('[data-skill-info] [data-automate]', this.page);

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
        skillSlot.start();
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
        saveObj.skills = {
            attackSkillName: this.attackSkillSlot.skill?.data.name || '',
            buffSkills: this.buffSkillSlots.filter(x => x.skill).map((x, index) => ({
                index,
                name: x.skill?.data.name || '',
                active: x.running,
                automate: x.automate,
                time: x.time
            }))
        }
    }
}

class BaseSkillSlot {
    readonly element: HTMLElement;
    skill?: BaseSkill;
    readonly progressBar: HTMLProgressElement;
    constructor() {
        this.element = this.createElement();
        this.progressBar = querySelector<HTMLProgressElement>('progress', this.element);
    }

    setSkill(skill?: BaseSkill) {
        this.skill = skill;
        this.slotLabelElement.textContent = skill?.data.name || '[Empty Slot]';
    }
    get hasSkill() { return typeof this.skill !== 'undefined'; }
    get canRemove() { return this.hasSkill }
    get slotLabelElement() { return querySelector('[data-skill-name]', this.element); }
    get canTrigger() { return false; }
    get canEnable() { return false; }

    protected createElement() {
        const li = document.createElement('li');
        li.classList.add('s-skill-slot', 'g-list-item');
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

class AttackSkillSlot extends BaseSkillSlot {
    constructor(readonly skills: Skills) {
        super();
        this.tryLoad();
    }
    get canEnable() { return true; }

    setSkill(skill: AttackSkill) {
        this.skill?.removeModifiers();
        super.setSkill(skill);
        skill.applyModifiers();
    }

    updateProgressBar(attackProgressPct: number) {
        this.progressBar.value = attackProgressPct > 1 ? 0 : attackProgressPct;
    }

    private tryLoad() {
        if (this.skills.game.saveObj.skills) {
            const name = this.skills.game.saveObj.skills.attackSkillName;
            const savedSkill = this.skills.attackSkills.find(x => x.data.name === name);
            if (savedSkill) {
                this.setSkill(savedSkill);
                return;
            }
        }
        if (!this.skills.attackSkills[0]) {
            throw Error('no attack skill available');
        }
        this.setSkill(this.skills.attackSkills[0]);
    }
}

class BuffSkillSlot extends BaseSkillSlot {
    private _running = false;
    private _time = 0;
    private _duration = 0;
    private _automate = false;
    private readonly player: Player;
    constructor(readonly skills: Skills) {
        super();
        this.setSkill(undefined);
        this.player = skills.game.player;
        this.tryLoad();
        highlightHTMLElement(skills.menuItem, 'click');
        highlightHTMLElement(this.element, 'mouseover');
    }
    get canEnable() {
        return !this.running;
    }
    get canRemove() {
        return this.hasSkill && !this._running;
    }
    get canTrigger() {
        return typeof this.skill !== 'undefined' && !this.automate && !this._running && this.skills.game.player.stats.curMana.get() > this.skill.data.manaCost;
    }
    get canAutomate() {
        return this.hasSkill;
    }
    get automate() {
        return this._automate;
    }
    set automate(v: boolean) {
        this._automate = v;
        if (this._automate && !this._running) {

        }
    }
    get running() { return this._running; }
    get time() { return this._time; }

    toggleAutomate() {
        this._automate = !this._automate;
        if (this._automate && !this._running) {
            this.start();
        }
    }

    setSkill(skill?: BuffSkill) {
        this.skill = skill;
        querySelector('[data-skill-name]', this.element).textContent = this.skill?.data.name || '[Empty Slot]';
    }

    updateProgressBar() {
        if (!this._running) {
            return;
        }
        this.progressBar.value = this._time / this._duration || 0;
    }

    //Start
    start() {
        if (!this.skill) {
            return;
        }
        const loopEval = (mana: number) => {
            if (!this.skill) {
                return;
            }
            if (mana < this.skill.data.manaCost) {
                return;
            }

            this.skills.game.player.stats.curMana.removeListener('change', loopEval);
            this.player.stats.curMana.subtract(this.skill.data.manaCost);
            this.loop();

        };
        this.skills.game.player.stats.curMana.addListener('change', loopEval);
        loopEval(this.skills.game.player.stats.curMana.get());
    }
    //Loop
    loop() {
        if (!this.skill) {
            return;
        }
        const calcDuration = (multiplier: number) => {
            const baseDuration = (this.skill as BuffSkill).data.baseDuration;
            return baseDuration * multiplier;
        };

        this._duration = calcDuration(this.skills.game.player.stats.skillDurationMultiplier.get());
        this._time = this._time > 0 ? this._time : this._duration;
        this._running = true;
        this.skills.game.player.stats.skillDurationMultiplier.addListener('change', calcDuration);
        this.skill.applyModifiers();
        const loopId = this.skills.game.gameLoop.subscribe((dt) => {
            if (!this.skill) {
                return;
            }

            // this._time = this._duration * (this._time / this._duration);

            if (this._time <= 0) {
                this._time = 0;
                this.skills.game.gameLoop.unsubscribe(loopId);
                this.skills.game.player.stats.skillDurationMultiplier.removeListener('change', calcDuration);
                this.stop();
                return;
            }
            this._time -= dt;
        });
    }

    //End
    stop() {
        if (!this.skill) {
            return;
        }
        this._running = false;
        this.player.modDB.removeBySource(this.skill.sourceName);
        this.progressBar.value = 0;
        if (this === this.skills.activeSkillSlot) {
            this.skills.showSkill(this.skill);
        }
        if (this._automate) {
            this.start();
            return;
        }
    }

    private tryLoad() {
        const savedSkillSlotData = this.skills.game.saveObj.skills?.buffSkills.find(x => x.index === this.skills.buffSkillSlots.length);
        if (savedSkillSlotData) {
            const skill = this.skills.buffSkills.find(x => x.data.name === savedSkillSlotData.name);
            if (skill) {
                this.setSkill(skill);
                this._time = savedSkillSlotData.time;
                this._automate = savedSkillSlotData.automate;
                if (savedSkillSlotData.active) {
                    this.loop();
                }
            }
        }
    }
}

abstract class BaseSkill {
    protected readonly _mods: Modifier[];
    constructor(readonly skills: Skills, readonly data: AttackSkillData | BuffSkillData) {
        this._mods = data.mods?.map(x => new Modifier(x)) || [];
    }
    get sourceName() {
        return `Skill/${this.data.name || '[error]'}`;
    }
    get mods() { return this._mods; }


    removeModifiers() {
        this.skills.game.player.modDB.removeBySource(this.sourceName);
    }
    applyModifiers() {
        this.skills.game.player.modDB.add(this.mods.flatMap(x => x.copy().stats), this.sourceName);
    }
}

class AttackSkill extends BaseSkill {
    constructor(readonly skills: Skills, readonly data: AttackSkillData) {
        super(skills, data);
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
    constructor(readonly skills: Skills, readonly data: BuffSkillData) {
        super(skills, data);
    }
}