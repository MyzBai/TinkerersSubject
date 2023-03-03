import { lerp, querySelector } from "@src/utils/helpers";
import { calcAilmentBaseDamage } from "./calc/calcDamage";
import { Configuration } from "./calc/calcMod";
import Game from "./Game";
import { StatModifierFlags } from "./mods";

export type AilmentType = 'Bleed' | 'Burn';

export interface AilmentData {
    type: AilmentType;
    damageFac: number;
}

export interface AilmentInstance extends AilmentData {
    time: number;
    damage: number;
}

abstract class AilmentHandler {
    readonly instances: AilmentInstance[] = [];
    protected loopId?: string;
    protected ailmentsListContainer: HTMLElement;
    protected element?: HTMLElement;
    protected progressBar?: HTMLProgressElement;
    protected timeSpan?: HTMLSpanElement;
    protected countSpan?: HTMLSpanElement;
    time = 0;
    protected duration = 0;
    protected maxNumActiveInstances = 0;
    constructor(readonly game: Game, readonly type: AilmentType) {
        this.ailmentsListContainer = querySelector('.p-combat [data-ailment-list]', game.page);
    }

    get numActiveInstances() { return Math.min(this.instances.length, this.maxNumActiveInstances); }

    setup() {
        this.removeElement();
        this.instances.splice(0);
    }
    updateDamage() { };

    addAilment(ailment: AilmentData) {
        if (this.instances.length === 0) {
            this.loopId = this.game.player.game.gameLoop.subscribe(dt => {
                this.tick(dt);
            });
            this.createElement();
        }
        const instance: AilmentInstance = { ...ailment, damage: 0, time: this.duration };
        this.instances.push(instance);
        this.updateDamage();
        this.time = this.duration;
        this.updateElement();
        this.updateProgressBar();
        return instance;
    }

    tick(dt: number) {
        if (this.instances.length === 0) {
            this.game.gameLoop.unsubscribe(this.loopId);
            this.removeElement();
            return;
        }
        this.time -= dt;
        for (let i = this.instances.length - 1; i >= 0; i--) {
            const instance = this.instances[i];
            if (!instance) {
                throw Error();
            }
            instance.time -= dt;
            if (instance.time <= 0) {
                this.instances.splice(i, 1);
            }
        }
    }

    reset() {
        this.instances.splice(0);
        this.removeElement();
    }

    protected createElement() {
        const li = document.createElement('li');
        li.insertAdjacentHTML('beforeend', `<div data-label>${this.type} <span data-time></span>s (<span data-count></span>)</div>`);

        this.progressBar = document.createElement('progress');
        this.progressBar.max = 1;
        this.progressBar.value = 0;
        li.appendChild(this.progressBar);
        this.element = li;
        this.ailmentsListContainer.appendChild(li);

        this.timeSpan = querySelector('[data-time]', li);
        this.countSpan = querySelector('[data-count]', li);
    }

    removeElement() {
        this.element?.remove();
    }

    updateElement() {
        if (!this.timeSpan || !this.countSpan) {
            return;
        }
        this.timeSpan.textContent = this.time.toFixed();
        this.countSpan.textContent = this.numActiveInstances.toFixed();
    }
    updateProgressBar() {
        if (!this.progressBar) {
            throw Error();
        }
        if (this.duration <= 0) {
            throw Error('ailment has no duration');
        }
        this.progressBar.value = this.time / this.duration;
    }

    protected calcDamage() {
        let damage = 0;
        for (let i = 0; i < this.instances.length; i++) {
            const instance = this.instances[i];
            if (!instance) {
                throw Error();
            }
            if (i < this.maxNumActiveInstances) {
                damage += instance.damage;
            }
        }
        return damage;
    }
}

class BleedHandler extends AilmentHandler {

    constructor(readonly game: Game) {
        super(game, 'Bleed');
    }

    setup() {
        super.setup();
        this.game.statistics.statistics['Bleed Duration'].addListener('change', amount => {
            const durationFac = amount / this.duration;
            this.time *= durationFac;
            this.instances.forEach(x => x.time *= durationFac);
            this.duration = amount;
        });
        this.game.statistics.statistics['Maximum Bleed Stacks'].addListener('change', amount => {
            this.maxNumActiveInstances = amount;
        });
        this.duration = this.game.statistics.statistics['Bleed Duration'].get();
        this.maxNumActiveInstances = this.game.statistics.statistics['Maximum Bleed Stacks'].get();
    }

    updateDamage() {
        const config: Configuration = {
            statModList: this.game.player.modDB.modList,
            flags: StatModifierFlags.Bleed | StatModifierFlags.Physical | StatModifierFlags.Ailment
        };
        const { min, max } = calcAilmentBaseDamage('Physical', config);
        this.instances.forEach(x => x.damage = (min + max) / 2 * x.damageFac);
        this.instances.sort((a, b) => b.damage - a.damage);
    }

    tick(dt: number): void {
        const damage = this.calcDamage() * dt;
        this.game.enemy.dealDamageOverTime(damage);
        this.game.statistics.statistics['Total Damage'].add(damage);
        this.game.statistics.statistics['Total Bleed Damage'].add(damage);
        this.game.statistics.statistics['Total Physical Damage'].add(damage);
        super.tick(dt);
    }
}

class BurnHandler extends AilmentHandler {
    constructor(readonly game: Game) {
        super(game, 'Burn');
    }

    setup(): void {
        super.setup();
        this.game.statistics.statistics['Burn Duration'].addListener('change', amount => {
            const durationFac = amount / this.duration;
            this.time *= durationFac;
            this.instances.forEach(x => x.time *= durationFac);
            this.duration = amount;
        });
        this.game.statistics.statistics['Maximum Burn Stacks'].addListener('change', amount => {
            this.maxNumActiveInstances = amount;
        });
        this.duration = this.game.statistics.statistics['Burn Duration'].get();
        this.maxNumActiveInstances = this.game.statistics.statistics["Maximum Burn Stacks"].get();
    }
    updateDamage() {
        const config: Configuration = {
            statModList: this.game.player.modDB.modList,
            flags: StatModifierFlags.Burn | StatModifierFlags.Elemental | StatModifierFlags.Ailment
        };
        const { min, max } = calcAilmentBaseDamage('Elemental', config);
        this.instances.forEach(x => x.damage = lerp(min, max, x.damageFac));
        this.instances.sort((a, b) => b.damage - a.damage);
    }

    tick(dt: number): void {
        const damage = this.calcDamage() * dt;
        this.game.enemy.dealDamageOverTime(damage);
        this.game.statistics.statistics['Total Damage'].add(damage);
        this.game.statistics.statistics['Total Burn Damage'].add(damage);
        this.game.statistics.statistics['Total Elemental Damage'].add(damage);
        super.tick(dt);
    }
}


export class Ailments {
    readonly handlers: AilmentHandler[] = [];
    readonly combatPage: HTMLElement;
    constructor(readonly game: Game) {
        this.combatPage = querySelector('.p-game .p-combat');
        this.handlers.push(new BleedHandler(game));
        this.handlers.push(new BurnHandler(game));
    }

    setup() {
        this.handlers.forEach(x => x.setup());

        this.game.player.modDB.onChange.listen(() => {
            this.handlers.forEach(x => {
                if (x.instances.length === 0) {
                    return;
                }
                x.updateDamage();
            });
        });

        this.game.visiblityObserver.registerLoop(this.combatPage, visible => {
            if (visible) {
                for (const handler of this.handlers) {
                    if (handler.instances.length === 0) {
                        continue;
                    }
                    handler.updateProgressBar();
                }
            }
        });
        this.game.visiblityObserver.registerLoop(this.combatPage, visible => {
            if (visible) {
                for (const handler of this.handlers) {
                    if (handler.instances.length === 0) {
                        continue;
                    }
                    handler.updateElement();
                }
            }
        }, { intervalMilliseconds: 1000 });

        this.handlers.forEach(x => {
            const save = this.game.saveObj.enemy?.ailments?.find(y => y.type === x.type);
            if (!save) {
                return;
            }
            let time = 0;
            for (const savedInstance of save.instances) {
                const instance = x.addAilment({ damageFac: savedInstance.damageFac, type: x.type });
                instance.time = savedInstance.time;
                time = Math.max(time, savedInstance.time);
            }
            x.time = time;
        });
    }

    reset() {
        this.handlers.forEach(x => {
            x.reset();
        });
    }

    get(type: AilmentType) {
        return this.handlers[type as keyof typeof this.handlers];
    }
    add(ailment: AilmentData) {
        const handler = this.handlers.find(x => x.type === ailment.type);
        if (!handler) {
            throw Error();
        }
        handler.addAilment(ailment);
    }
}