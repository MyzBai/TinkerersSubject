import { querySelector } from "@src/utils/helpers";
import { calcAilmentBaseDamage } from "./calc/calcDamage";
import { Configuration } from "./calc/calcMod";
import Game from "./Game";
import { StatModifierFlags } from "./mods";

export type AilmentType = 'Bleed';

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
    protected numActiveInstances = 0;
    protected maxNumActiveInstances = 0;
    constructor(readonly game: Game, readonly type: AilmentType) {
        this.ailmentsListContainer = querySelector('.p-combat [data-ailment-list]', game.page);
    }

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
        this.numActiveInstances = Math.min(this.instances.length, this.maxNumActiveInstances);
        this.updateElement();
        this.updateProgressBar();
        return instance;
    }

    tick(dt: number) {
        if (this.instances.length === 0) {
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

        if (this.instances.length === 0) {
            this.game.gameLoop.unsubscribe(this.loopId);
            this.removeElement();
        }
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
    };
    removeElement() {
        this.element?.remove();
    }

    updateElement() {
        if (!this.timeSpan || !this.countSpan) {
            return;
        }
        this.timeSpan.textContent = Math.ceil(this.time).toFixed();
        this.countSpan.textContent = this.numActiveInstances.toFixed();
        // console.log(this.time);
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
        this.game.player.stats.bleedDuration.addListener('change', amount => {
            const pct = this.time / this.duration;
            this.duration = amount;
            this.time = this.duration * pct;
        });
        this.game.player.stats.maxBleedStacks.addListener('change', amount => {
            this.maxNumActiveInstances = amount;
        });
        this.duration = this.game.player.stats.bleedDuration.get();
        this.maxNumActiveInstances = this.game.player.stats.maxBleedStacks.get();
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
        this.game.statistics.statistics['Total Bleed Damage'].add(damage);
        this.game.statistics.statistics['Total Physical Damage'].add(damage);
        super.tick(dt);
    }
}


export class Ailments {
    readonly handlers: AilmentHandler[] = [];
    readonly combatPage: HTMLElement;
    constructor(readonly game: Game) {
        this.combatPage = querySelector('.p-game .p-combat');
        this.handlers.push(new BleedHandler(game));
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
            const save = this.game.saveObj.enemy?.ailments?.find(x => x.type === x.type);
            if (!save) {
                return;
            }
            for (const savedInstance of save.instances) {
                const instance = x.addAilment({ damageFac: savedInstance.damageFac, type: x.type });
                instance.time = savedInstance.time;
            }
            x.time = Math.max(...save.instances.map(x => x.time).sort().reverse());
        });
    }

    clear() {
        this.handlers.forEach(x => {
            x.removeElement();
            x.instances.splice(0);
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