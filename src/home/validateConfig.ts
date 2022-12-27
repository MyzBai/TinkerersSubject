import Ajv from 'ajv';
import schema from '@public/gconfig/schema.json';


export const validateConfig = new Ajv().compile(schema);