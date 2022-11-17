import path from "node:path";

import { bundleRequire } from "bundle-require";
import JoyCon from "joycon";

import { loadJson } from "../json";
import { defaultConfig } from "./constants";
import { DotsecConfig, PartialConfig } from "./types";

export const getConfig = async (filename?: string): Promise<DotsecConfig> => {
	const cwd = process.cwd();
	const configJoycon = new JoyCon();
	const configPath = await configJoycon.resolve({
		files: filename
			? [filename]
			: [
					"dotsec.config.ts",
					"dotsec.config.js",
					"dotsec.config.cjs",
					"dotsec.config.mjs",
					"dotsec.config.json",
					"package.json",
			  ],
		cwd,
		stopDir: path.parse(cwd).root,
		packageKey: "dotsec",
	});
	if (filename && configPath === null) {
		throw new Error(`Could not find config file ${filename}`);
	}
	if (configPath) {
		if (configPath.endsWith(".json")) {
			const rawData = (await loadJson(configPath)) as PartialConfig;

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
				...defaultConfig,
				...data,
				aws: { ...defaultConfig.aws, ...data.aws },
			};
		}

		const config = await bundleRequire({
			filepath: configPath,
		});

		const retrievedConfig =
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			(config.mod.dotsec as Partial<DotsecConfig>) ||
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			(config.mod.default as Partial<DotsecConfig>) ||
			config.mod;
		return {
			...defaultConfig,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			...retrievedConfig,
		};
	}

	return { ...defaultConfig };
};
