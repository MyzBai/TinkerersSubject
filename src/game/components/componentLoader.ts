import type GConfig from '@src/types/gconfig';
import type { Save } from '../saveGame';
import { init as initPassives, loadPassives, savePassives } from './passives';
import { init as initItems, loadItems, saveItems } from './items/items';
import { init as initMissions, saveMissions, loadMissions } from './missions';
import { init as initAchievements } from './achievements';

export function initComponents(config: GConfig) {
    initPassives(config.passives);
    initItems(config.items);
    initMissions(config.missions);
    initAchievements(config.achievements);
}

export function saveComponents(saveObj: Save) {
    savePassives(saveObj);
    saveItems(saveObj);
    saveMissions(saveObj);
}

export function loadComponents(saveObj: Save) {
    loadPassives(saveObj);
    loadItems(saveObj);
    loadMissions(saveObj);
}