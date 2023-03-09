import Statistics from "@src/game/Statistics";
import type Skills from "./Skills";
import { AttackSkill, BuffSkill, Skill } from "./Skills";
import { BuffSkillSlot, Triggerable } from "./skillSlots";

export default class SkillViewer {
    private rankIndex = 0;

    private readonly container: HTMLElement;
    private readonly decrementRankButton: HTMLButtonElement;
    private readonly incrementRankButton: HTMLButtonElement;
    private readonly enableButton: HTMLButtonElement;
    private readonly triggerButton: HTMLButtonElement;
    private readonly automateButton: HTMLButtonElement;
    private readonly removeButton: HTMLButtonElement;
    private readonly unlockButton: HTMLButtonElement;
    private readonly cancelButton: HTMLButtonElement;

    constructor(private readonly skills: Skills) {
        this.container = skills.page.querySelectorForce('[data-skill-info]');

        this.decrementRankButton = this.container.querySelectorForce('header [data-type="decrement"]');
        this.incrementRankButton = this.container.querySelectorForce('header [data-type="increment"]');
        this.enableButton = this.container.querySelectorForce('[data-enable]');
        this.triggerButton = this.container.querySelectorForce('[data-trigger]');
        this.automateButton = this.container.querySelectorForce('[data-automate]');
        this.removeButton = this.container.querySelectorForce('[data-remove]');
        this.unlockButton = this.container.querySelectorForce('[data-unlock]');
        this.cancelButton = this.container.querySelectorForce('[data-cancel]');

        this.decrementRankButton.addEventListener('click', () => {
            this.createView(skills.activeSkill!, this.rankIndex - 1);
        });
        this.incrementRankButton.addEventListener('click', () => {
            this.createView(skills.activeSkill!, this.rankIndex + 1);
        });

        this.enableButton.addEventListener('click', () => {
            skills.activeSkill.setRankByIndex(this!.rankIndex);
            skills.activeSkillSlot.setSkill(skills.activeSkill);
            this.createView(skills.activeSkill!, this.rankIndex);
        });
        this.removeButton.addEventListener('click', () => {
            if (skills.activeSkillSlot.canRemove) {
                skills.activeSkillSlot.setSkill(undefined);
                this.createView(skills.activeSkill, this.rankIndex);
            }
        });
        this.triggerButton.addEventListener('click', () => {
            if (skills.activeSkillSlot.canTrigger) {
                (skills.activeSkillSlot as Triggerable).trigger();
                this.createView(skills.activeSkillSlot.skill!, this.rankIndex);
            }
        });
        this.automateButton.addEventListener('click', () => {
            const skillSlot = skills.activeSkillSlot as BuffSkillSlot;
            if (skillSlot instanceof BuffSkillSlot && skillSlot.skill) {
                skillSlot.toggleAutomate();
                this.createView(skillSlot.skill, this.rankIndex);
            }
        });

        this.unlockButton.addEventListener('click', () => {
            const rank = this.skills.activeSkill?.ranks[this.rankIndex!];
            if (rank) {
                Statistics.statistics.Gold.subtract(rank.config.goldCost || 0);
                rank.unlocked = true;
                this.createView(this.skills.activeSkill, this.rankIndex);
            }
        });
        this.cancelButton.addEventListener('click', () => {
            if (this.skills.activeSkillSlot instanceof BuffSkillSlot) {
                this.skills.activeSkillSlot.cancel();
                this.createView(this.skills.activeSkill, this.rankIndex);
            }
        });
    }

    createView(skill: Skill, rankIndex?: number) {
        if (typeof rankIndex === 'number') {
            this.rankIndex = rankIndex;
        } else {
            this.rankIndex = skill.rankIndex;
        }

        const rank = skill.ranks[this.rankIndex];
        if (!rank) {
            throw RangeError('rank index out of bounds');
        }

        //header
        {
            this.container.querySelectorForce('[data-title]').textContent = rank.config.name;
            this.decrementRankButton.style.visibility = 'hidden';
            this.incrementRankButton.style.visibility = 'hidden';
            if (skill.ranks.length > 1) {
                this.decrementRankButton.style.visibility = 'visible';
                this.incrementRankButton.style.visibility = 'visible';
                this.decrementRankButton.disabled = this.rankIndex <= 0;
                this.incrementRankButton.disabled = !rank.unlocked || this.rankIndex >= skill.ranks.length - 1;
            }
        }

        //stats
        {
            const table = this.container.querySelectorForce('table');
            table.replaceChildren();
            table.insertAdjacentHTML('beforeend', `<tr><td>Mana Cost</td><td>${rank?.config.manaCost.toFixed()}</td></tr>`);
            if (skill instanceof AttackSkill) {
                table.insertAdjacentHTML('beforeend', `<tr><td>Attack Speed</td><td>${skill.ranks[this.rankIndex]?.config.attackSpeed.toFixed(2)}</td></tr>`);
                table.insertAdjacentHTML('beforeend', `<tr><td>Base Damage Multiplier</td><td>${skill.ranks[this.rankIndex]?.config.baseDamageMultiplier.toFixed()}%</td></tr>`);
            } else if (skill instanceof BuffSkill) {
                table.insertAdjacentHTML('beforeend', `<tr><td>Duration</td><td>${skill.ranks[this.rankIndex]?.config.baseDuration.toFixed()}s</td></tr>`);
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
            this.container.querySelectorForce('.s-mods').replaceChildren(...modElements);
        }

        const activeSkillSlot = this.skills.activeSkillSlot;

        this.enableButton.disabled = !this.validateEnableButton(skill, rank);
        this.enableButton.classList.toggle('hidden', !rank.unlocked);
        if (rank.unlocked && activeSkillSlot instanceof BuffSkillSlot) {
            if (activeSkillSlot.skill?.rank === rank) {
                this.enableButton.classList.add('hidden');
            }
        }


        this.unlockButton.classList.toggle('hidden', rank.unlocked);
        this.unlockButton.disabled = Statistics.statistics.Gold.get() < (rank.config.goldCost || 0);
        this.unlockButton.innerHTML = `<span>Unlock <span class="g-gold">${rank.config.goldCost}</span></span>`;


        this.removeButton.classList.toggle('hidden', skill instanceof AttackSkill || activeSkillSlot.skill?.rank !== rank);
        this.removeButton.disabled = !activeSkillSlot.canRemove;


        this.triggerButton.classList.add('hidden');
        this.cancelButton.classList.add('hidden');
        this.automateButton.classList.add('hidden');

        if(activeSkillSlot instanceof BuffSkillSlot && activeSkillSlot.skill?.rank === rank){

            this.triggerButton.classList.toggle('hidden', activeSkillSlot.running);
            this.cancelButton.classList.toggle('hidden', !activeSkillSlot.running);
            this.cancelButton.disabled = activeSkillSlot.automate;
            this.automateButton.classList.toggle('hidden', !activeSkillSlot.running);
            
            this.automateButton.classList.remove('hidden');
            this.automateButton.disabled = !activeSkillSlot.canAutomate;
            this.automateButton.textContent = `Auto ${activeSkillSlot.automate ? 'On' : 'Off'}`;
            this.automateButton.setAttribute('data-role', activeSkillSlot.automate ? 'confirm' : 'cancel');
        }
    }

    private validateEnableButton(skill: Skill, rank: Skill['rank']) {
        if (!rank.unlocked) {
            return false;
        }
        if (this.skills.activeSkillSlot.skill?.rank === rank) {
            return false;
        }
        if (skill instanceof BuffSkill) {
            if (this.skills.buffSkillSlots.filter(x => x !== this.skills.activeSkillSlot).some(x => x.skill === skill)) {
                return false;
            }
        }

        return this.skills.activeSkillSlot.canEnable;
    }
}