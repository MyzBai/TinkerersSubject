import Ajv from 'ajv';
import schema from '@public/gconfig/configSchema.json';


export const validateConfig = new Ajv().compile(schema);