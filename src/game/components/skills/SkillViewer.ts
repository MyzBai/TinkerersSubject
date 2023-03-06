import { querySelector } from "@src/utils/helpers";
import type Skills from "./Skills";
import { AttackSkill, BuffSkill, Skill } from "./Skills";
import { BuffSkillSlot, Triggerable } from "./skillSlots";

export default class SkillViewer {
    private readonly container: HTMLElement;
    private readonly decrementRankButton: HTMLButtonElement;
    private readonly incrementRankButton: HTMLButtonElement;
    private readonly enableButton: HTMLButtonElement;
    private readonly triggerButton: HTMLButtonElement;
    private readonly automateButton: HTMLButtonElement;
    private readonly removeButton: HTMLButtonElement;
    private rankProgress?: HTMLElement;
    private readonly skillViewInfo: { skill?: Skill, rankIndex: number } = { rankIndex: 0 };
    constructor(private readonly skills: Skills) {
        this.container = querySelector('[data-skill-info]', skills.page);

        this.decrementRankButton = querySelector('header [data-type="decrement"]', this.container);
        this.incrementRankButton = querySelector('header [data-type="increment"]', this.container);
        this.enableButton = querySelector('[data-enable]', this.container);
        this.triggerButton = querySelector('[data-trigger]', this.container);
        this.automateButton = querySelector('[data-automate]', this.container);
        this.removeButton = querySelector('[data-remove]', this.container);

        this.decrementRankButton.addEventListener('click', () => {
            this.createView(skills.activeSkill!, this.skillViewInfo.rankIndex - 1);
        });
        this.incrementRankButton.addEventListener('click', () => {
            this.createView(skills.activeSkill!, this.skillViewInfo.rankIndex + 1);
        });

        this.enableButton.addEventListener('click', () => {
            skills.activeSkill.setRankByIndex(this.skillViewInfo!.rankIndex);
            skills.activeSkillSlot.setSkill(skills.activeSkill);
            this.createView(skills.activeSkill!, this.skillViewInfo.rankIndex);
        });
        this.removeButton.addEventListener('click', () => {
            if (skills.activeSkillSlot.canRemove) {
                skills.activeSkillSlot.setSkill(undefined);
                this.createView(skills.activeSkill, this.skillViewInfo.rankIndex);
            }
        });
        this.triggerButton.addEventListener('click', () => {
            if (skills.activeSkillSlot.canTrigger) {
                (skills.activeSkillSlot as Triggerable).trigger();
                this.createView(skills.activeSkillSlot.skill!, this.skillViewInfo.rankIndex);
            }
        });
        this.automateButton.addEventListener('click', () => {
            const skillSlot = skills.activeSkillSlot as BuffSkillSlot;
            if (skillSlot instanceof BuffSkillSlot && skillSlot.skill) {
                skillSlot.toggleAutomate();
                this.createView(skillSlot.skill, this.skillViewInfo.rankIndex);
            }
        });
    }

    createView(skill: Skill, rankIndex?: number) {
        rankIndex = typeof rankIndex === 'number' ? rankIndex : skill.ranks.indexOf(skill.rank);
        this.skillViewInfo.skill = skill;
        this.skillViewInfo.rankIndex = rankIndex;

        const rank = skill.ranks[rankIndex];
        if (!rank) {
            throw Error();
        }

        //header
        {
            const header = querySelector('header', this.container);
            querySelector('.title', header).textContent = rank.config.name;
            if (skill.ranks.length === 1) {
                this.decrementRankButton.style.visibility = 'hidden';
                this.incrementRankButton.style.visibility = 'hidden';
            } else {
                this.decrementRankButton.style.visibility = 'visible';
                this.incrementRankButton.style.visibility = 'visible';
                this.decrementRankButton.disabled = rankIndex <= 0;
                this.incrementRankButton.disabled = rankIndex >= skill.ranks.length - 1;
            }

            querySelector('header .title', this.container).textContent = rank.config.name;
        }

        //stats
        {
            const table = querySelector('table', this.container);
            table.replaceChildren();
            table.appendChild(this.createTableRow('Mana Cost', (rank.config.manaCost || 0).toFixed()));

            if (skill instanceof AttackSkill) {
                table.appendChild(this.createTableRow('Attack Speed', skill.ranks[rankIndex]!.config.attackSpeed.toFixed(2)));
                table.appendChild(this.createTableRow('Base Damage', skill.ranks[rankIndex]!.config.baseDamageMultiplier.toFixed() + '%'));
            } else if (skill instanceof BuffSkill) {
                table.appendChild(this.createTableRow('Duration', skill.ranks[rankIndex]!.config.baseDuration.toFixed() + 's'));
            }


            this.rankProgress = undefined;
            if (rankIndex > 0) {
                let prefix = skill instanceof AttackSkill ? 'Attacks' : 'Triggers';
                const rank = skill.ranks[rankIndex];
                const target = rank?.progress.target;
                const row = this.createTableRow(prefix,
                    `<var data-rank-progress></var>/<span>${target}</span>`);
                this.rankProgress = row.querySelector('[data-rank-progress]') || undefined;
                // this.updateRankProgress(skill, rankIndex);
                table.appendChild(row);
            }
        }


        //mods
        if (rank.config.mods) {
            const modElements: HTMLElement[] = [];
            for (const mod of rank.mods) {
                const modElement = document.createElement('div');
                modElement.classList.add('g-mod-desc');
                modElement.textContent = mod.desc;
                modElements.push(modElement);
            }
            querySelector('.s-mods', this.container).replaceChildren(...modElements);
        }
        this.updateView();

    }

    updateView() {
        const { skill, rankIndex } = this.skillViewInfo;
        const rank = skill?.ranks[rankIndex];
        if (!rank) {
            throw RangeError();
        }
        //buttons
        const hideExtraButtons = skill instanceof AttackSkill || this.skills.activeSkillSlot.skill !== skill;
        this.removeButton.classList.toggle('hidden', hideExtraButtons);
        this.triggerButton.classList.toggle('hidden', hideExtraButtons);
        this.automateButton.classList.toggle('hidden', hideExtraButtons);


        const sameSkillAndRank = (this.skills.activeSkillSlot.skill === skill && this.skills.activeSkillSlot.skill.rank === rank);
        const anotherAlreadyEnabled = [this.skills.attackSkillSlot, ...this.skills.buffSkillSlots].filter(x => x !== this.skills.activeSkillSlot).some(x => x.skill === skill);

        const canEnable = this.skills.activeSkillSlot.canEnable && rank.unlocked && !sameSkillAndRank && !anotherAlreadyEnabled;
        this.enableButton.disabled = !canEnable;

        if (skill instanceof BuffSkill && this.skills.activeSkillSlot instanceof BuffSkillSlot && this.skills.activeSkillSlot.skill === skill) {
            this.removeButton.disabled = !this.skills.activeSkillSlot.canRemove || !sameSkillAndRank;
            this.triggerButton.disabled = !this.skills.activeSkillSlot.canTrigger || !sameSkillAndRank;
            this.automateButton.disabled = !this.skills.activeSkillSlot.canAutomate;

            this.automateButton.setAttribute('data-role', this.skills.activeSkillSlot.automate ? 'confirm' : 'cancel');
        } else {
            this.removeButton.disabled = true;
            this.triggerButton.disabled = true;
            this.automateButton.disabled = true;
        }

        if (this.rankProgress) {
            this.rankProgress.textContent = Math.min(rank.progress.current, rank.progress.target).toFixed();
        }
    }

    private createTableRow(label: string, value: string) {
        const row = document.createElement('tr');
        row.insertAdjacentHTML('beforeend', `<td>${label}</td>`);
        row.insertAdjacentHTML('beforeend', `<td>${value}</td>`);
        return row;
    };
}