import { querySelector } from "@src/utils/helpers";
import { calcAilmentDamage, calcAilmentDuration } from "./calc/calcDamage";
import Enemy from "./Enemy";
import type Entity from "./Entity";
import Game from "./Game";

export type AilmentType = 'Bleed' | 'Burn';
export interface AilmentData {
    type: AilmentType;
    duration: number;
    source: Entity;
    damageFac?: number;
    detachCallback?: (instance: AilmentInstance) => void;
}

interface BleedInstance extends AilmentInstance {
    type: 'Bleed';
    damage: number;
    damageFac: number;
}

export interface AilmentInstance extends AilmentData {
    duration: number;
    damage?: number;
    time: number;
}

const isBleedInstance = (instance: AilmentInstance): instance is BleedInstance => instance.type === "Bleed";

export default class Ailments {
    private tickId?: string;
    // readonly instances: AilmentInstance[] = [];
    private readonly sources = new Map<Entity, AilmentInstance[]>;
    private readonly ailmentListContainer = querySelector('.p-combat [data-ailment-list]');
    constructor() {

        this.updateInstances = this.updateInstances.bind(this);

    }

    init() {
        Game.visiblityObserver.registerLoop(querySelector('.p-game .p-combat'), visible => {
            if (visible) {
                this.updateElements();
            }
        });
    }

    setup() {

    }

    reset() {

    }

    addAilments(source: Entity, ...ailments: AilmentData[]) {
        if (!this.sources.has(source)) {
            this.sources.set(source, []);
            source.onStatsUpdate.listen(this.updateInstances);
        }
        const instances = this.sources.get(source) || this.sources.set(source, []).get(source);
        if (!instances) {
            return;
        }
        for (const ailment of ailments) {
            const hasAilmentType = [...this.sources.values()].some(x => x.some(y => y.type === ailment.type));
            if (!hasAilmentType) {
                this.createElement(ailment.type);
            }
            instances?.push({ ...ailment, time: ailment.duration });
        }
        this.updateInstances(source);
        if (!this.tickId) {
            this.tickId = Game.gameLoop.subscribe(dt => {
                this.tick(dt);
            });
        }
    }

    private createElement(type: AilmentType) {
        const li = document.createElement('li');
        li.setAttribute('data-type', type);
        li.insertAdjacentHTML('beforeend', `<div data-label>${type} <span data-time></span>s (<span data-count></span>)</div>`);
        const progressBar = document.createElement('progress');
        progressBar.max = 1;
        progressBar.value = 0;
        li.appendChild(progressBar);

        this.ailmentListContainer.appendChild(li);

        // this.timeSpan = li.querySelectorForce('[data-time]');
        // this.countSpan = li.querySelectorForce('[data-count]');
    }

    private removeElement(type: AilmentType) {
        this.ailmentListContainer.querySelector(`[data-type="${type}"]`)?.remove();
    }

    private updateElements() {
        const elements = this.ailmentListContainer.querySelectorAll('[data-type]');
        for (const element of elements) {
            const timeSpan = element.querySelector('[data-time]');
            const countSpan = element.querySelector('[data-count]');
            if (!timeSpan || !countSpan) {
                return;
            }
            const type = element.getAttribute('data-type') as AilmentType;
            const instances = [...this.sources.values()].flatMap(x => x.filter(x => x.type === type));
            const maxTime = Math.max(...instances.map(x => x.time));
            const count = instances.length;

            timeSpan.textContent = maxTime.toFixed();
            countSpan.textContent = count.toFixed();

            const progressBar = element.querySelector<HTMLProgressElement>('progress');
            if (progressBar) {
                const maxDuration = Math.max(...instances.map(x => x.duration));
                const pct = maxTime / maxDuration;
                progressBar.value = pct;
            }
        }

    }

    private updateInstances(source: Entity) {
        this.updateDuration(source);
        this.updateDamage(source);
    }

    private removeAilment(ailment: AilmentInstance) {
        const instances = this.sources.get(ailment.source);
        if (!instances) {
            return;
        }
        const index = instances.indexOf(ailment);
        if (index !== -1) {
            instances.splice(index, 1);
            if (instances.length === 0) {
                this.sources.delete(ailment.source);
            }
            ailment.detachCallback?.(ailment);
        }

        if (![...this.sources.values()].some(x => x.length > 0)) {
            Game.gameLoop.unsubscribe(this.tickId);
            this.tickId = undefined;
        }
        if (instances.length === 0) {
            ailment.source.onStatsUpdate.removeListener(this.updateInstances);
        }
    }

    private updateDuration(source: Entity) {
        const instances = this.sources.get(source);
        if (!instances) {
            return;
        }

        //bleed
        {
            const bleedDuration = calcAilmentDuration(source, 'Bleed');
            instances.filter(x => x.type === 'Bleed').forEach(x => x.duration = bleedDuration);
        }
    }

    private updateDamage(source: Entity) {
        const instances = this.sources.get(source);
        if (!instances) {
            return;
        }

        //bleed
        {
            const bleedInstances = instances.filter(isBleedInstance);
            if(bleedInstances){
                const { min, max } = calcAilmentDamage(source, 'Bleed');
                const avgDamage = (min + max) / 2;
                bleedInstances.forEach(x => x.damage = avgDamage * x.damageFac);
            }
        }
    }

    tick(dt: number) {

        for (const [source, instances] of this.sources) {
            for (let i = instances.length - 1; i >= 0; i--) {
                const instance = instances[i]!;
                if ('damage' in instance) {
                    if (instance.damage) {
                        this.dealDamage(source, instance.damage * dt, instance.type);
                    }
                }

                instance.time -= dt;
                if (instance.time <= 0) {
                    this.removeAilment(instance);
                    if (instances.filter(x => x.type === instance.type).length === 0) {
                        this.removeElement(instance.type);
                    }
                }
            }
        }
    }

    private dealDamage(source: Entity, damage: number, type: AilmentType) {
        Enemy.dealDamageOverTime(damage);
        source.stats[`Total ${type} Damage`].add(damage);
    }
}