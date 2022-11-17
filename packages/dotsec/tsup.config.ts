import type { Options } from 'tsup';

export const tsup: Options = {
    splitting: false,
    sourcemap: true,
    clean: true,
    dts: true,
    format: ['cjs', 'esm'],
    legacyOutput: true,
    entryPoints: ['src/index.ts', 'src/cli.ts', 'src/ds/cli.ts'],
};
