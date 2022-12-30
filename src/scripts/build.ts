import esbuild from 'esbuild';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { EnvironmentVariables } from '@src/types/environmentVariables';

const envPath = path.resolve('./public/env.json');

(async () => {

    const args = process.argv.splice(2);
    const gcpath = args.find(x => x.includes('gcpath='))?.substring(7);
    const text = await fs.readFile(envPath, { encoding: 'utf-8' });
    const env = JSON.parse(text) as EnvironmentVariables;
    if (gcpath) {
        env.gConfigPath = gcpath;
        fs.writeFile(envPath, JSON.stringify(env, null, 4), 'utf-8');
    }

    esbuild.build({
        entryPoints: ['src/main.ts'],
        bundle: true,
        minify: true,
        watch: args.includes('--watch'),
        outdir: 'public/dist',
        treeShaking: true,
        platform: 'browser',
        format: 'iife',
        sourcemap: true,
        supported: {
            'dynamic-import': true
        },
        target: ['chrome58', 'firefox57', 'safari11', 'edge29']
    })

})();