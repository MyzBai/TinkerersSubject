import esbuild from 'esbuild';

build();

const watch = () => {
    onRebuild
}

async function build() {
    const result = await esbuild.build({
        entryPoints: ["src/main.ts"],
        outdir: "public/dist",
        bundle: true,
        sourcemap: true,
        watch: true,
        treeShaking: true,
        incremental: false,
        platform: 'browser',
        target: ['es2015',
            'chrome60',
            'firefox54',
            'ios12',
            'safari11.1',],
        logLevel: 'info'
    });
    if (result.errors.length > 0) {
        console.log(result.errors);
    }
    if (result.warnings.length > 0) {
        console.log(result.warnings);
    }
    console.log("esbuild complete!");
}
