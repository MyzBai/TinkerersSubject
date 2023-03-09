import { highlightHTMLElement, registerTabs } from "@src/utils/helpers";
import Game, { Save } from "../../Game";
import Player from '../../Player';
import Statistics from '../../Statistics';
import { Modifier } from "../../mods";
import Component from "../Component";
import SkillViewer from "./SkillViewer";
import { AttackSkillSlot, BuffSkillSlot, SkillSlot } from "./skillSlots";


export interface SkillRankData<T> {
    config: T;
    mods: Modifier[];
    rankProgress: number;
    startRankProgress: number;
}

export default class Skills extends Component {
    activeSkill: Skill;
    readonly attackSkills: AttackSkill[] = [];
    readonly buffSkills: BuffSkill[] = [];
    activeSkillSlot: SkillSlot;

    readonly attackSkillSlot: AttackSkillSlot;
    readonly buffSkillSlots: BuffSkillSlot[] = [];

    readonly skillViewer: SkillViewer;
    constructor(readonly config: SkillsConfig) {
        super('skills');
        this.skillViewer = new SkillViewer(this);
        {
            this.attackSkillSlot = new AttackSkillSlot(this);
            this.activeSkillSlot = this.attackSkillSlot;

            const attackSkillListContainer = this.page.querySelectorForce<HTMLElement>('[data-attack-skill-list]');
            this.attackSkillSlot.element.addEventListener('click', () => {
                this.activeSkillSlot = this.attackSkillSlot;
                this.selectSkillListItem(this.attackSkillSlot.skill, attackSkillListContainer);
                this.selectSkillListItemByName(this.attackSkillSlot.skill.firstRank!.config.name, attackSkillListContainer);
            });

            for (const skill of config.attackSkills.skillList) {
                const levelReq = Array.isArray(skill) ? skill[0]!.levelReq : skill.levelReq;
                Statistics.statistics.Level.registerCallback(levelReq || 1, () => {
                    const attackSkill = new AttackSkill(skill);
                    this.attackSkills.push(attackSkill);
                    this.addSkillListItem(attackSkill, attackSkillListContainer);
                });
            }

            if (!this.attackSkillSlot.skill) {
                this.attackSkillSlot.setSkill(this.attackSkills[0]!);
            }
            this.attackSkillSlot.element.click();
            this.activeSkill = this.attackSkillSlot.skill;
        }

        if (config.buffSkills) {
            this.buffSkills = [...config.buffSkills.skillList.sort((a, b) => (a.levelReq || 1) - (b.levelReq || 1)).map(x => new BuffSkill(x))];
            Object.seal(this.buffSkills);
            const buffSkillSlotContainer = this.page.querySelectorForce('.s-skill-slots [data-buff-skill-slots]');
            const buffSkillListContainer = this.page.querySelectorForce<HTMLElement>('[data-buff-skill-list]');
            for (const buffSkillConfig of config.buffSkills.skillSlots) {
                Statistics.statistics.Level.registerCallback(buffSkillConfig.levelReq, () => {
                    const slot = new BuffSkillSlot(this);
                    slot.element.setAttribute('data-tab-target', 'buff');
                    slot.element.addEventListener('click', () => {
                        this.activeSkillSlot = slot;
                        this.selectSkillListItem(this.activeSkillSlot.skill, buffSkillListContainer);
                    });
                    buffSkillSlotContainer.appendChild(slot.element);
                    this.buffSkillSlots.push(slot);
                });
            }

            for (const skill of this.buffSkills) {
                Statistics.statistics.Level.registerCallback(skill.firstRank.config.levelReq || 1, () => {
                    this.addSkillListItem(skill, buffSkillListContainer);
                });
            }
        }

        Game.visiblityObserver.registerLoop(this.page, visible => {
            if (visible) {
                this.attackSkillSlot.updateProgressBar(Player.attackProgressPct);
                for (const buffSkillSlot of this.buffSkillSlots) {
                    buffSkillSlot.updateProgressBar();
                }
            }
        });

        Game.visiblityObserver.register(this.page, visible => {
            if (visible) {
                this.skillViewer.createView(this.activeSkill);
            }
        });

        registerTabs(this.page.querySelectorForce('.s-skill-slots'), this.page.querySelectorForce('.s-skill-list'));
        this.attackSkillSlot.element.click();
    }

    private addSkillListItem(skill: Skill, container: HTMLElement) {
        const li = document.createElement('li');
        li.classList.add('g-list-item');
        li.setAttribute('data-name', skill.name || 'unknown');
        li.textContent = skill.name || 'unknown';
        li.addEventListener('click', () => {
            this.selectSkillListItem(skill, container);
        });
        highlightHTMLElement(this.menuItem, 'click');
        highlightHTMLElement(li, 'mouseover');
        container.appendChild(li);
    }

    private selectSkillListItem(skill: Skill | undefined, container: HTMLElement) {
        const skillInfoContainer = this.page.querySelectorForce<HTMLElement>('[data-skill-info]');
        skillInfoContainer.classList.toggle('hidden', container.childElementCount === 0);
        if (skill) {
            this.activeSkill = skill;
            container.querySelectorAll('[data-name]').forEach(x => x.classList.toggle('selected', x.getAttribute('data-name') === skill.firstRank!.config.name));
            this.skillViewer.createView(skill);
        } else {
            const element = container.querySelector<HTMLElement>('[data-name]:first-child');
            element?.click();
        }
    }

    private selectSkillListItemByName(name: string, container: HTMLElement) {
        container.querySelector<HTMLLIElement>(`[data-name="${name}"]`)?.click();
    }

    save(saveObj: Save): void {
        saveObj.skills = {
            attackSkillSlot: {
                name: this.attackSkillSlot.skill.firstRank?.config.name || 'unknown',
                rankIndex: this.attackSkillSlot.skill.ranks.indexOf(this.attackSkillSlot.skill.rank),
            },
            attackSkillList: this.attackSkills.reduce<AttackSkillSave[]>((a, c) => {
                for (const rank of c.ranks) {
                    if (!rank.unlocked) {
                        continue;
                    }
                    a.push({ name: rank.config.name });
                }
                return a;
            }, []),
            buffSkillSlotList: this.buffSkillSlots.reduce<BuffSkillSlotSave[]>((a, c) => {
                if (!c.skill) {
                    return a;
                }
                const { automate, time, running } = c;
                const name = c.skill?.name;
                const index = this.buffSkillSlots.indexOf(c);
                const rankIndex = c.skill.ranks.indexOf(c.skill.rank);
                a.push({ automate, index, name, rankIndex, time, running });
                return a;
            }, []),
            buffSkillList: this.buffSkills.reduce<BuffSkillSave[]>((a, c) => {
                for (const rank of c.ranks) {
                    if (!rank.unlocked) {
                        continue;
                    }
                    a.push({ name: rank.config.name });
                }
                return a;
            }, [])
        };
    }
}

interface Rank<T extends AttackSkillConfig | BuffSkillConfig> {
    config: T;
    mods: Modifier[];
    unlocked: boolean;
}

export abstract class Skill {
    readonly abstract ranks: Rank<AttackSkillConfig | BuffSkillConfig>[];
    abstract rank: Rank<AttackSkillConfig | BuffSkillConfig>;
    protected _rankIndex = 0;

    get firstRank() {
        return this.ranks[0]!;
    }
    get sourceName() {
        return `Skill/${this.firstRank!.config.name || 'unknown'}`;
    }
    get name() {
        return this.firstRank.config.name;
    }
    get rankIndex() {
        return this._rankIndex;
    }

    setRankByIndex(index: number) {
        const rank = this.ranks[index];
        this._rankIndex = index;
        if (!rank) {
            throw RangeError();
        }
        this.rank = rank;
    }

    getNextRank() {
        return this.ranks[this._rankIndex + 1];
    }
}

export class AttackSkill extends Skill {
    readonly ranks: Rank<AttackSkillConfig>[] = [];
    rank: Rank<AttackSkillConfig>;
    constructor(configs: AttackSkillConfig | AttackSkillConfig[]) {
        super();
        configs = Array.isArray(configs) ? configs : [configs];
        for (const config of configs) {
            this.ranks.push({
                config,
                mods: config.mods.map(x => new Modifier(x)),
                unlocked: !!Game.saveObj?.skills?.attackSkillList?.find(x => x?.name === config.name) || config.goldCost === 0
            });
        }
        this.rank = this.firstRank as Rank<AttackSkillConfig>;
    }
}

export class BuffSkill extends Skill {
    readonly ranks: Rank<BuffSkillConfig>[] = [];
    rank: Rank<BuffSkillConfig>;

    constructor(configs: BuffSkillConfig | BuffSkillConfig[]) {
        super();
        configs = Array.isArray(configs) ? configs : [configs];
        for (const config of configs) {
            this.ranks.push({
                config,
                mods: config.mods.map(x => new Modifier(x)),
                unlocked: !!Game.saveObj?.skills?.buffSkillList?.find(x => x?.name === config.name) || config.goldCost === 0
            });
        }
        this.rank = this.firstRank as Rank<BuffSkillConfig>;
    }
}


//config
export interface SkillsConfig {
    attackSkills: {
        skillList: (AttackSkillConfig | AttackSkillConfig[])[]
    };
    buffSkills?: {
        skillSlots: BuffSkillSlotConfig[];
        skillList: (BuffSkillConfig | BuffSkillConfig)[];
    }
}

export interface AttackSkillConfig {
    name: string;
    attackSpeed: number;
    manaCost: number;
    goldCost: number;
    baseDamageMultiplier: number;
    levelReq?: number;
    mods: string[];
}

export interface BuffSkillSlotConfig {
    levelReq: number;
}
export interface BuffSkillConfig {
    name: string;
    baseDuration: number;
    manaCost: number;
    goldCost: number;
    levelReq: number;
    mods: string[];
}

//save
export interface SkillsSave {
    attackSkillSlot: AttackSkillSlotSave;
    attackSkillList: AttackSkillSave[];
    buffSkillSlotList: BuffSkillSlotSave[];
    buffSkillList: BuffSkillSave[];
}

interface AttackSkillSlotSave {
    name: string;
    rankIndex: number;
}
interface AttackSkillSave {
    name: string;
}
interface BuffSkillSlotSave {
    name: string;
    index: number;
    time: number;
    automate: boolean;
    running: boolean;
    rankIndex: number;
}
interface BuffSkillSave {
    name: string;
}