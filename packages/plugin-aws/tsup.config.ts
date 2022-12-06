import type { Options } from "tsup";

export const tsup: Options = {
	splitting: false,
	sourcemap: true,
	minify: true,
	clean: true,
	dts: true,
	format: ["cjs", "esm"],
	skipNodeModulesBundle: true,
	entryPoints: ["src/index.ts"],
};
