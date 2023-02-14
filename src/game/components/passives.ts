// import type GConfig from "@src/types/gconfig";
// import { highlightHTMLElement, queryHTML } from "@src/utils/helpers";
// import { Modifier } from "../mods";
// import { modDB, playerStats } from "../player";
// import type { Save } from "../saveGame";

// const SOURCE_NAME: string = 'Passives';

// const passivesMenuButton = queryHTML('.p-game > menu [data-tab-target="passives"]');
// const passivesPage = queryHTML('.p-game .p-passives');
// const passivesList = queryHTML('[data-passives-list]', passivesPage);
// const curPointsSpan = queryHTML('header [data-cur-points]', passivesPage);
// const maxPointsSpan = queryHTML('header [data-max-points]', passivesPage);
// const clearButton = queryHTML<HTMLButtonElement>('header [data-clear]', passivesPage);

// clearButton.addEventListener('click', () => clearPassives());
// const getMaxPoints = () => pointsPerLevel * (playerStats.level.get() - 1);
// const getCurPoints = () => passives.filter(x => x.assigned).reduce((a, c) => a += c.points, 0);

<<<<<<< Updated upstream
let passives: Passive[];
let pointsPerLevel: number;
export function init(data: GConfig['passives']) {
    if (!data) {
        return;
    }
    passives = [];
    pointsPerLevel = 1;
=======
// let passives: Passive[];
// let pointsPerLevel: number;
// export function init(data: GConfig['passives']) {
//     if(!data){
//         return;
//     }
//     passives = [];
//     pointsPerLevel = 1;
>>>>>>> Stashed changes

//     for (const passiveData of data.passiveList) {
//         const passive = new Passive(passiveData);
//         passives.push(passive);
//     }

//     passivesList.replaceChildren(...passives.map(x => x.element));
//     updateList();

<<<<<<< Updated upstream
    passivesMenuButton.classList.remove('hidden');
=======
//     if(data.levelReq > 1){
//         const listener = (level: number) => {
//             if(level >= data.levelReq){
//                 passivesMenuButton.classList.remove('hidden');
//                 playerStats.level.removeListener('change', listener);
//             }
//         };
//         playerStats.level.addListener('change', listener);
//     }
>>>>>>> Stashed changes

//     playerStats.level.addListener('change', level => {
//         passives.forEach(x => x.tryUnlock());
//         const pointsGained = Math.floor(getMaxPoints() - (pointsPerLevel * level - 2)) > 0;
//         if (pointsGained) {
//             highlightHTMLElement(passivesMenuButton, 'click');
//         }
//         updateList();
//     });

// }

// function clearPassives() {
//     passives.filter(x => x.assigned).forEach(x => x.unassign());
//     updateList();
// }

// function updateList() {
//     const maxPoints = getMaxPoints();
//     const curPoints = getCurPoints();
//     const diff = maxPoints - curPoints;

//     maxPointsSpan.textContent = maxPoints.toFixed();
//     curPointsSpan.textContent = curPoints.toFixed();

//     for (const passive of passives) {
//         if (!passive.assigned) {
//             passive.element.toggleAttribute('disabled', passive.points > diff);
//         }
//         passive.element.classList.toggle('selected', passive.assigned);
//     }
// }

// export function savePassives(save: Save) {
//     save.passives = {
//         list: passives.filter(x => x.assigned).map(x => {
//             return {
//                 index: passives.indexOf(x),
//                 desc: x.mod.desc
//             }
//         })
//     };
// }

<<<<<<< Updated upstream
export function loadPassives(save: Save) {
    const savedPassives = save.passives;
    if (!savedPassives) {
        passives.forEach(x => x.unassign());
        return;
    }
    const valid = savedPassives.list.every(x => {
        const passive = passives[x.index];
        return passive.mod.desc === x.desc;
    });
    if (valid) {
        savedPassives.list.forEach(x => {
            const passive = passives[x.index];
            passive.assign();
        })
        updateList();
    }
}
=======
// export function loadPassives(save: Save) {
//     const savedPassives = save.passives;
//     if(!savedPassives){
//         passives.forEach(x => x.unassign());
//         return;
//     }
//     const valid = savedPassives.list.every(x => {
//         const passive = passives[x.index];
//         return passive.mod.desc === x.desc;
//     });
//     if (valid) {
//         savedPassives.list.forEach(x => {
//             const passive = passives[x.index];
//             passive.assign();
//         })
//         updateList();
//     }
// }
>>>>>>> Stashed changes


// class Passive {
//     readonly levelReq: number;
//     readonly points: number;
//     readonly mod: Modifier;
//     readonly element: HTMLLIElement;
//     private _assigned: boolean;
//     private locked: boolean;
//     constructor(passiveData: NonNullable<GConfig['passives']>['passiveList'][number]) {
//         this.levelReq = passiveData.levelReq;
//         this.points = passiveData.points;
//         this.mod = new Modifier(passiveData.mod);
//         this.element = this.createElement();
//         this.locked = this.levelReq > 1;
//         this.element.classList.toggle('hidden', this.locked);
//         this._assigned = false;
//     }

//     get assigned() { return this._assigned; }

//     tryUnlock() {
//         if (!this.locked || playerStats.level.get() < this.levelReq) {
//             return;
//         }
//         this.locked = false;
//         this.element.classList.remove('hidden');
//         highlightHTMLElement(passivesMenuButton, 'click');
//         highlightHTMLElement(this.element, 'mouseover');
//     }

//     assign() {
//         this._assigned = true;
//         modDB.add(this.mod.copy().stats, SOURCE_NAME.concat('/', passives.indexOf(this).toFixed()));
//     }

//     unassign() {
//         this._assigned = false;
//         modDB.removeBySource(SOURCE_NAME.concat('/', passives.indexOf(this).toFixed()));
//     }

//     private toggle() {
//         if (this._assigned) {
//             this.unassign();
//         } else {
//             this.assign();
//         }
//     }
//     private createElement() {
//         const li = document.createElement('li');
//         li.classList.add('g-list-item', 'g-field');
//         li.insertAdjacentHTML('beforeend', `<div>${this.mod.desc}</div>`);
//         li.insertAdjacentHTML('beforeend', `<var>${this.points}</var>`);
//         li.addEventListener('click', () => {
//             this.toggle();
//             updateList();
//         });
//         return li;
//     }
// }