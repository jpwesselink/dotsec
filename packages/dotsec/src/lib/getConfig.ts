import { DOTSEC_CONFIG_FILES, defaultConfig } from "../constants";
import { DotsecConfig } from "../types/config";
import { DotsecConfigAndSource } from "../types/plugin";
import { loadJson } from "./json";
import { bundleRequire } from "bundle-require";
import JoyCon from "joycon";
import path from "path";

export const getMagicalConfig = async (
	filename?: string,
): Promise<DotsecConfigAndSource> => {
	const cwd = process.cwd();
	const configJoycon = new JoyCon();
	const configPath = await configJoycon.resolve({
		files: filename ? [filename] : [...DOTSEC_CONFIG_FILES, "package.json"],
		cwd,
		stopDir: path.parse(cwd).root,
		packageKey: "dotsec",
	});
	if (filename && configPath === null) {
		throw new Error(`Could not find config file ${filename}`);
	}
	if (configPath) {
		if (configPath.endsWith(".json")) {
			const rawData = (await loadJson(configPath)) as Partial<DotsecConfig>;

			let data: Partial<DotsecConfig>;

			if (
				configPath.endsWith("package.json") &&
				(rawData as { dotsec: Partial<DotsecConfig> }).dotsec !== undefined
			) {
				data = (rawData as { dotsec: Partial<DotsecConfig> }).dotsec;
			} else {
				data = rawData as Partial<DotsecConfig>;
			}

			return {
				source: "json",
				contents: {
					...defaultConfig,
					...data,
					defaults: {
						...data?.defaults,
						...defaultConfig.defaults,
						options: {
							...data?.defaults?.options,
							...defaultConfig.defaults?.options,
						},
						plugins: {
							...data?.defaults?.plugins,
							...defaultConfig.defaults?.plugins,
						},
					},
					push: {
						...data?.push,
					},
				},
			};
		} else if (configPath.endsWith(".ts")) {
			const bundleRequireResult = await bundleRequire({
				filepath: configPath,
			});
			const data = (bundleRequireResult.mod.dotsec ||
				bundleRequireResult.mod.default ||
				bundleRequireResult.mod) as Partial<DotsecConfig>;

			return {
				source: "ts",
				contents: {
					...defaultConfig,
					...data,
					defaults: {
						...data?.defaults,
						...defaultConfig.defaults,
						plugins: {
							...data?.defaults?.plugins,
							...defaultConfig.defaults?.plugins,
						},
						options: {
							...data?.defaults?.options,
							...defaultConfig.defaults?.options,
						},
					},
					push: {
						...data?.push,
					},
				},
			};
		}
	}

	return { source: "defaultConfig", contents: defaultConfig };
};
