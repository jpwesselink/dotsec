import { DefaultConfig, DotsecConfig } from "../types";
import { defaultConfig } from "./defaultConfig";
import fs from "node:fs/promises";
import { Err, Ok, Option, Result } from "ts-results-es";
import yaml from "yaml";

export type CreateConfig = (
	...userConfigs: Array<DotsecConfig | DefaultConfig | undefined>
) => Result<
	{
		config: DefaultConfig;

		mergeConfig: CreateConfig;
	},
	string
>;
export const createConfig: CreateConfig = (...userConfigs) => {
	const merge =
		(firstConfig: DefaultConfig) =>
		(...userConfigs: Array<DotsecConfig | DefaultConfig | undefined>) => {
			return (userConfigs || []).reduce<DefaultConfig>(
				(firstConfig, secondConfig) => {
					return {
						...firstConfig,
						...secondConfig,
						aws: {
							...firstConfig.aws,
							...secondConfig?.aws,
							kms: {
								...firstConfig.aws?.kms,
								...secondConfig?.aws?.kms,
							},
							ssm: {
								...firstConfig.aws?.ssm,
								...secondConfig?.aws?.ssm,
							},
							secretsManager: {
								...firstConfig.aws?.secretsManager,
								...secondConfig?.aws?.secretsManager,
							},
						},
						commands: {
							...firstConfig?.commands,
							...secondConfig?.commands,
						},
					};
				},
				firstConfig,
			);
		};

	const config = merge(defaultConfig)(...userConfigs);
	return new Ok({
		mergeConfig: (
			...userConfigs: Array<DotsecConfig | DefaultConfig | undefined>
		) => {
			return createConfig(config, ...userConfigs);
		},
		config: merge(defaultConfig)(...userConfigs),
	});
};

export const loadConfigFromFile = async (options: {
	configFile: string;
	verbose: Option<boolean>;
}): Promise<Result<DotsecConfig, string>> => {
	// if it is a yaml file, load it as yaml
	// todo: consider casing, etc
	const { configFile } = options;
	const fileExtension = configFile.split(".").pop();
	let rawConfig: string;
	try {
		rawConfig = await fs.readFile(configFile, "utf-8");
	} catch (e) {
		if (options.verbose) {
			console.log(`Could not load config file at ${configFile}, skipping...`);
		}
		return Err(`Could not load config file at ${configFile}, skipping...`);
	}
	if (fileExtension === "yaml" || fileExtension === "yml") {
		// parse yaml
		if (options.verbose) {
			console.log(`Parsing config file at ${configFile} as yaml...`);
		}

		return new Ok(yaml.parse(rawConfig) as DotsecConfig);
	} else if (fileExtension === "json") {
		// load json
		if (options.verbose) {
			console.log(`Parsing config file at ${configFile} as json...`);
		}
		return Ok(JSON.parse(rawConfig) as DotsecConfig);
	}

	return Err("Unsupported config file type");
};
