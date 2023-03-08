import Ajv from 'ajv';
import gameConfigSchema from '@public/gconfig/schemas/gameConfig.schema.json';
import playerSchema from '@public/gconfig/schemas/definitions/player.schema.json';
import enemiesSchema from '@public/gconfig/schemas/definitions/enemies.schema.json';
import optionsSchema from '@public/gconfig/schemas/definitions/options.schema.json';
import tasksSchema from '@public/gconfig/schemas/definitions/tasks.schema.json';
import modsSchema from '@public/gconfig/schemas/definitions/mods.schema.json';
import componentsSchema from '@public/gconfig/schemas/definitions/components/components.schema.json';
import skillsSchema from '@public/gconfig/schemas/definitions/components/skills.schema.json';
import passivesSchema from '@public/gconfig/schemas/definitions/components/passives.schema.json';
import itemsSchema from '@public/gconfig/schemas/definitions/components/items.schema.json';
import missionsSchema from '@public/gconfig/schemas/definitions/components/missions.schema.json';
import achievementsSchema from '@public/gconfig/schemas/definitions/components/achievements.schema.json';
import minionsSchema from '@public/gconfig/schemas/definitions/components/minions.schema.json';

export const configValidator = new Ajv({ strictTuples: false, schemas: [playerSchema, enemiesSchema, optionsSchema, tasksSchema, modsSchema, componentsSchema, skillsSchema, passivesSchema, itemsSchema, missionsSchema, achievementsSchema, minionsSchema] }).compile(gameConfigSchema);
