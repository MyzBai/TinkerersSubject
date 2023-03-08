import { lerp, querySelector } from "@src/utils/helpers";
import { calcAilmentBaseDamage } from "./calc/calcDamage";
import type { Configuration } from "./calc/calcMod";
import Enemy from "./Enemy";
import game from "./Game";
import { StatModifierFlags } from "./mods";
import Player from "./Player";
import Statistics from "./Statistics";

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
    constructor(readonly type: AilmentType) {
        this.ailmentsListContainer = querySelector('.p-combat [data-ailment-list]');
    }

    get numActiveInstances() {
        return Math.min(this.instances.length, this.maxNumActiveInstances);
    }

    setup() {
        this.removeElement();
        this.instances.splice(0);
    }
    abstract updateDamage(): void;

    addAilment(ailment: AilmentData) {
        if (this.instances.length === 0) {
            this.loopId = game.gameLoop.subscribe(dt => {
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
            game.gameLoop.unsubscribe(this.loopId);
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

        this.timeSpan = li.querySelectorForce('[data-time]');
        this.countSpan = li.querySelectorForce('[data-count]');
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

    constructor() {
        super('Bleed');
    }

    setup() {
        super.setup();
        Statistics.statistics['Bleed Duration'].addListener('change', amount => {
            const durationFac = amount / this.duration;
            this.time *= durationFac;
            this.instances.forEach(x => x.time *= durationFac);
            this.duration = amount;
        });
        Statistics.statistics['Maximum Bleed Stacks'].addListener('change', amount => {
            this.maxNumActiveInstances = amount;
        });
        this.duration = Statistics.statistics['Bleed Duration'].get();
        this.maxNumActiveInstances = Statistics.statistics['Maximum Bleed Stacks'].get();
    }

    updateDamage() {
        const config: Configuration = {
            statModList: Player.modDB.modList,
            flags: StatModifierFlags.Bleed | StatModifierFlags.Physical | StatModifierFlags.Ailment
        };
        const { min, max } = calcAilmentBaseDamage('Physical', config);
        this.instances.forEach(x => x.damage = (min + max) / 2 * x.damageFac);
        this.instances.sort((a, b) => b.damage - a.damage);
    }

    tick(dt: number): void {
        const damage = this.calcDamage() * dt;
        Enemy.dealDamageOverTime(damage);
        Statistics.statistics['Total Damage'].add(damage);
        Statistics.statistics['Total Bleed Damage'].add(damage);
        Statistics.statistics['Total Physical Damage'].add(damage);
        super.tick(dt);
    }
}

class BurnHandler extends AilmentHandler {
    constructor() {
        super('Burn');
    }

    setup(): void {
        super.setup();
        Statistics.statistics['Burn Duration'].addListener('change', amount => {
            const durationFac = amount / this.duration;
            this.time *= durationFac;
            this.instances.forEach(x => x.time *= durationFac);
            this.duration = amount;
        });
        Statistics.statistics['Maximum Burn Stacks'].addListener('change', amount => {
            this.maxNumActiveInstances = amount;
        });
        this.duration = Statistics.statistics['Burn Duration'].get();
        this.maxNumActiveInstances = Statistics.statistics["Maximum Burn Stacks"].get();
    }
    updateDamage() {
        const config: Configuration = {
            statModList: Player.modDB.modList,
            flags: StatModifierFlags.Burn | StatModifierFlags.Elemental | StatModifierFlags.Ailment
        };
        const { min, max } = calcAilmentBaseDamage('Elemental', config);
        this.instances.forEach(x => x.damage = lerp(min, max, x.damageFac));
        this.instances.sort((a, b) => b.damage - a.damage);
    }

    tick(dt: number): void {
        const damage = this.calcDamage() * dt;
        Enemy.dealDamageOverTime(damage);
        Statistics.statistics['Total Damage'].add(damage);
        Statistics.statistics['Total Burn Damage'].add(damage);
        Statistics.statistics['Total Elemental Damage'].add(damage);
        super.tick(dt);
    }
}


export class Ailments {
    readonly handlers: AilmentHandler[] = [];
    constructor() {
        this.handlers.push(new BleedHandler());
        this.handlers.push(new BurnHandler());
    }

    setup() {
        this.handlers.forEach(x => x.setup());

        Player.modDB.onChange.listen(() => {
            this.handlers.forEach(x => {
                if (x.instances.length === 0) {
                    return;
                }
                x.updateDamage();
            });
        });

        game.visiblityObserver.registerLoop(querySelector('.p-game .p-combat'), visible => {
            if (visible) {
                for (const handler of this.handlers) {
                    if (handler.instances.length === 0) {
                        continue;
                    }
                    handler.updateProgressBar();
                }
            }
        });
        game.visiblityObserver.registerLoop(querySelector('.p-game .p-combat'), visible => {
            if (visible) {
                for (const handler of this.handlers) {
                    if (handler.instances.length === 0) {
                        continue;
                    }
                    handler.updateElement();
                }
            }
        }, { intervalMilliseconds: 1000 });

        this.tryLoad();

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

    private tryLoad() {
        try {
            this.handlers.forEach(x => {
                const save = game.saveObj?.enemy?.ailments?.find(y => y && y.type === x.type);
                if (!save) {
                    return;
                }
                let time = 0;
                for (const savedInstance of save.instances || []) {
                    const instance = x.addAilment({ damageFac: savedInstance?.damageFac || 1, type: x.type });
                    instance.time = savedInstance?.time || 0;
                    time = Math.max(time, instance.time);
                }
                x.time = time;
            });
        } catch (e) {
            throw Error('failed loading ailments');
        }
    }
}

//save
export interface AilmentSave {
    type: AilmentType;
    instances: AilmentInstanceSave[];
}

interface AilmentInstanceSave {
    damageFac?: number;
    time: number;
}