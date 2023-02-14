<<<<<<< Updated upstream
import statistics from "../statistics";
import { modDB, playerStats } from "../player";
import type { Mod, GConfig } from "@src/types/gconfig";
import gameLoop from "../gameLoop";
import { Modifier } from "@game/mods";
import { visibilityObserver } from '@utils/Observers';
import { highlightHTMLElement } from "@utils/helpers";
=======
// import statistics from "../statistics";
// import { modDB, playerStats } from "../player";
// import type { Mod, GConfig } from "@src/types/gconfig";
// import { gameLoop } from "../game";
// import { Modifier } from "@game/mods";
// import { visibilityObserver } from '@utils/Observers';
// import { highlightHTMLElement } from "@utils/helpers";
>>>>>>> Stashed changes

// type Validator = [RegExp, () => string, ((cur: number, target: number) => boolean)?];

// const validators: Validator[] = [
//     [/^Reach Level {(\d+)}$/, () => playerStats.level.get().toFixed()],
//     [/^Prestige {\d+}?$/, () => statistics["Prestige Count"].get().toFixed()],
//     [/^Deal Damage {(\d+)}$/, () => statistics["Total Damage"].get().toFixed()],
//     [/^Deal Physical Damage {(\d+)}$/, () => statistics["Total Physical Damage"].get().toFixed()],
//     [/^Perform Hits {(\d+)}$/, () => statistics.Hits.get().toFixed()],
//     [/^Perform Critical Hits {(\d+)}$/, () => statistics["Critical Hits"].get().toFixed()],
//     [/^Generate Gold {(\d+)}$/, () => statistics["Gold Generated"].get().toFixed()],
//     [/^Regenerate Mana {(\d+)}$/, () => statistics["Mana Generated"].get().toFixed()],
// ];
// const achievementsMenuButton = document.querySelector<HTMLElement>('.p-game > menu [data-tab-target="achievements"]')!;

<<<<<<< Updated upstream
const achievements: Achievement[] = [];
let updateId: string;
=======
// const achievements: Achievement[] = [];
// let updateId: number = -1;
>>>>>>> Stashed changes

// visibilityObserver(document.querySelector('.p-game .p-achievements')!, handleUpdateLoop);

<<<<<<< Updated upstream
export function init(data: GConfig['achievements']) {
    if(!data){
        return;
    }
    achievements.splice(0);
    for (const item of data.list) {
        achievements.push(new Achievement(item));
    }
    document.querySelector('.p-achievements ul')!.replaceChildren(...achievements.map(x => x.element));
=======
// export function init(data: GConfig['achievements']) {
//     achievements.splice(0);
//     for (const item of data.list) {
//         achievements.push(new Achievement(item));
//     }
//     document.querySelector('.p-achievements ul')!.replaceChildren(...achievements.map(x => x.element));
>>>>>>> Stashed changes

//     //validate loop
//     gameLoop.subscribe(() => {
//         validateAchievements();
//     }, { intervalMilliseconds: 1000 });

<<<<<<< Updated upstream
    achievementsMenuButton.classList.remove('hidden');
}

function validateAchievements() {
    achievements.forEach(achievement => {
        const isComplete = achievement.validate();
        if (isComplete) {
            achievement.complete();
        }
    });
}
=======
//     if(data.levelReq > 1){
//         const listener = (level: number) => {
//             if (level >= data.levelReq) {
//                 playerStats.level.removeListener('change', listener);
//                 achievementsMenuButton.classList.remove('hidden');
//                 highlightHTMLElement(achievementsMenuButton, 'click');
//             }
//         }
//         playerStats.level.addListener('change', listener);
//     }
// }

// function validateAchievements(){
//     achievements.forEach(achievement => {
//         const isComplete = achievement.validate();
//         if (isComplete) {
//             achievement.complete();
//         }
//     });
// }
>>>>>>> Stashed changes

// function handleUpdateLoop(visible: boolean) {
//     if (visible) {
//         achievements.forEach(x => x.updateDescription());
//         updateId = gameLoop.subscribe(() => achievements.forEach(x => x.updateDescription()),
//             { intervalMilliseconds: 1000 });
//     } else {
//         gameLoop.unsubscribe(updateId);
//     }
// }

// class Achievement {
//     completed: boolean = false;
//     private readonly validator: Validator;
//     private readonly matchIndex: number;
//     private readonly targetValue: number;
//     private readonly description: string;
//     private readonly modList: Mod[];
//     readonly element: HTMLElement;
//     constructor(args: GConfig['achievements']['list'][number]) {
//         this.description = args.description.replace(/[{}]/g, '');
//         this.modList = [...args?.modList || []];

//         const validator = validators.find(x => x[0].exec(args.description));
//         if (!validator) {
//             throw Error('no achievement validator found');
//         }
//         this.validator = validator;
//         const match = validator[0].exec(args.description) as RegExpMatchArray;
//         this.targetValue = Number(match[1]);
//         this.matchIndex = args.description.match(/{\d+}/)?.index as number;
//         this.element = this.createElement();
//     }

//     updateDescription() {
//         if (this.completed) {
//             return;
//         }
//         this.element.querySelector('[data-cur-value]')!.textContent = this.validator[1]();
//     }

//     validate() {
//         if (this.completed) {
//             return;
//         }
//         const curValue = Number(this.validator[1]());
//         let valid = false;
//         if (this.validator[2]) {
//             valid = this.validator[2](curValue, this.targetValue);
//         } else {
//             valid = curValue >= this.targetValue;
//         }
//         return valid;
//     }

//     complete() {
//         this.completed = true;
//         this.applyModifiers();
//         this.removeCurValueFromDesc();
//         this.element.querySelector('var')!.toggleAttribute(`data-valid`, this.completed);
//         highlightHTMLElement(achievementsMenuButton, 'click');
//         highlightHTMLElement(this.element, 'mouseover');
//     }

//     private applyModifiers() {
//         const modifiers = this.modList.map(x => new Modifier(x));
//         modDB.add(modifiers.flatMap(x => x.stats), 'Achievement/' + this.description);
//     }

//     private removeCurValueFromDesc() {
//         const varElement = this.element.querySelector('var')!;
//         const innerHTML = varElement.innerHTML;
//         const endIndex = innerHTML.indexOf('</span>');
//         varElement.innerHTML = innerHTML.substring(endIndex + 8);
//     }

//     private createElement() {
//         const accordion = document.createElement('li');
//         accordion.classList.add('g-accordion');
//         const header = document.createElement('div');
//         accordion.appendChild(header);
//         header.classList.add('header');
//         header.insertAdjacentHTML('beforeend', `<div>${this.description.substring(0, this.matchIndex)}<var><span data-cur-value>${this.validator[1]()}</span>/${this.targetValue.toString()}</var>${this.description.substring(this.matchIndex + this.targetValue.toString().length)}</div>`)

//         if (this.modList.length > 0) {
//             const content = document.createElement('div');
//             accordion.appendChild(content);
//             content.classList.add('content');
//             for (const mod of this.modList) {
//                 content.insertAdjacentHTML('beforeend', `<div class="g-mod-desc">${mod.replace(/[{}]/g, '')}</div>`);
//             }
//             header.insertAdjacentHTML('beforeend', `<i></i>`);
//             header.addEventListener('click', () => {
//                 header.toggleAttribute('data-open');
//             });
//         }
//         return accordion;
//     }
// }