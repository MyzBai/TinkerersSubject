import fs from 'fs/promises';
import path from 'path';

(async () => {

    await setupEnv();



})();

async function setupEnv() {
    const filePath = path.resolve('public/env.json');
    const text = await fs.readFile(filePath);
    /**@type {import('../src/types/environmentVariables').EnvironmentVariables} */
    const env = JSON.parse(text);

    env.env = 'production';
    env.gConfigPath = 'public/gconfig/demo.json';

    await fs.writeFile(filePath, JSON.stringify(env, null, 4));

}