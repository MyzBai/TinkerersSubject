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
            // this.attackSkills = [...this.config.attackSkills.skillList.sort((a, b) => (a.levelReq || 1) - (b.levelReq || 1))].map(x => new AttackSkill(x));
            // Object.seal(this.attackSkills);

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
                this.skillViewer.updateView();
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
            attackSkillList: this.attackSkills.reduce<SkillsSave['attackSkillList']>((a, c) => {
                a.push(...c.ranks.map(x => ({ name: x.config.name, rankProgress: x.rankProgress })).filter(x => x.rankProgress > 0));
                return a;
            }, []),
            buffSkillSlotList: this.buffSkillSlots.reduce<SkillsSave['buffSkillSlotList']>((a, c) => {
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
            buffSkillList: this.buffSkills.reduce<SkillsSave['buffSkillList']>((a, c) => {
                a.push(...c.ranks.map(x => ({ name: x.config.name, rankProgress: x.rankProgress })).filter(x => x.rankProgress > 0));
                return a;
            }, [])
        };
    }
}

interface RankProgress {
    current: number;
    target: number;
}

export class Rank<T extends AttackSkillConfig | BuffSkillConfig> {
    private _unlocked: boolean;
    constructor(readonly config: T, readonly progress: RankProgress, readonly mods: Modifier[]) {

        this._unlocked = progress.current >= progress.target;
    }

    get unlocked() {
        return this._unlocked;
    }
    get rankProgress() {
        return this.progress.current;
    }

    incrementProgress() {
        this.progress.current++;

        this._unlocked = this.progress.current >= this.progress.target;
        // const progress = this.rankProgress - rankData.startRankProgress;
        // return (progress || 1 / Math.max(rankData.config.attackCountReq || 0, 1)) >= 1;
    }

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
            const rankProgress = Game.saveObj?.skills?.attackSkillList?.find(x => x && x.name === config.name)?.rankProgress || 0;
            const mods = config.mods?.map(x => new Modifier(x)) || [];
            const rank = new Rank(config, { current: rankProgress, target: config.attackCountReq || 0 }, mods);
            this.ranks.push(rank);
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
            const rankProgress = Game.saveObj?.skills?.buffSkillList?.find(x => x && x.name === config.name)?.rankProgress || 0;
            const mods = config.mods?.map(x => new Modifier(x)) || [];
            this.ranks.push(new Rank(config, { current: rankProgress, target: config.triggerCountReq || 0 }, mods));
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

export interface AttackSkillConfig{
    name: string;
    attackSpeed: number;
    manaCost?: number;
    baseDamageMultiplier: number;
    levelReq?: number;
    mods?: string[];
    attackCountReq?: number;
}

export interface BuffSkillSlotConfig{
    levelReq: number;
}
export interface BuffSkillConfig{
    name: string;
    baseDuration: number;
    manaCost?: number;
    levelReq?: number;
    mods?: string[];
    triggerCountReq?: number;
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
    rankProgress: number;
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
    rankProgress: number;
}