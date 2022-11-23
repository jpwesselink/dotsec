import path from "node:path";

import { bundleRequire } from "bundle-require";
import JoyCon from "joycon";

import { loadJson } from "../json";
import { DotsecConfig, DotsecConfigAndSource } from "../../types";
import { defaultConfig, DOTSEC_CONFIG_FILES } from "../../constants";

export const getConfig = async (
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
					config: {
						...defaultConfig.config,
						aws: { ...defaultConfig?.config?.aws, ...data.config?.aws },
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
					config: {
						...defaultConfig.config,
						aws: { ...defaultConfig?.config?.aws, ...data.config?.aws },
					},
				},
			};
		}
	}

	return { source: "defaultConfig", contents: defaultConfig };
};
