import type { Options } from "tsup";

export const tsup: Options = {
	splitting: false,
	sourcemap: true,
	minify: true,
	clean: true,
	dts: true,
	format: ["cjs", "esm"],
	skipNodeModulesBundle: true,
	entryPoints: ["src/cli/index.ts", "src/index.ts"],
};
