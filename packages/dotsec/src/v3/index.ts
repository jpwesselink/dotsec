import { createConfig, loadConfigFromFile } from "./config";
import { SsmAvailableCases } from "./constants";
import { configureDecrypt } from "./lib/decrypt";
import { configureEncrypt } from "./lib/encrypt";
import { configurePush } from "./lib/push";
import { configureRun } from "./lib/run";
import {
	AwsSsmExpandedPushValue,
	AwsSsmPushValue,
	CommandParams,
	DefaultsAwsSsm,
	PushOptions,
} from "./types";
import * as changeCase from "change-case";
import path from "node:path";
import { None, Some } from "ts-results-es";

// export type CliParams = {
// 	awsRegion?: string;
// 	awsKmsRegion?: string;
// 	awsKmsKeyAlias?: string;
// 	awsSsmRegion?: string;
// 	awsSsmType?: "String" | "SecureString";
// 	awsSsmChangeCase?: SsmAvailableCases;
// 	awsSsmPathPrefix?: string;
// 	awsSecretsManagerRegion?: string;
// 	awsSecretsManagerChangeCase?: SecretsManagerAvailableCases;
// 	awsSecretsManagerPathPrefix?: string;
// };

export const dotsec = async (options?: CommandParams) => {
	// first try to load the config from the file
	const loadConfigResult = await loadConfigFromFile({
		configFile: options?.configFile || "dotsec.json",
		verbose: options?.verbose ? Some(options.verbose) : None,
	});

	const loadedConfig = loadConfigResult.unwrap();

	// if env file is defined from the config file, add the path relative to the config file
	if (loadedConfig.defaults?.envFile) {
		// add path relative to either options?.configFile or process.cwd()
		if (options?.configFile) {
			loadedConfig.defaults = {
				...loadedConfig.defaults,
				envFile: path.resolve(
					path.dirname(options.configFile),
					loadedConfig.defaults?.envFile,
				),
			};
		} else {
			loadedConfig.defaults = {
				...loadedConfig.defaults,
				envFile: path.resolve(process.cwd(), loadedConfig.defaults?.envFile),
			};
		}
	}
	const createConfigResult = createConfig(loadedConfig, options?.config);

	const { mergeConfig /*, config */ } = createConfigResult.unwrap();
	// initial config is available here

	const encrypt = configureEncrypt(mergeConfig);
	const decrypt = configureDecrypt(mergeConfig);
	const run = configureRun({ mergeConfig, decrypt });
	const push = configurePush({ mergeConfig, decrypt });
	return {
		encrypt,
		decrypt,
		run,
		push,
	};
};

void (async () => {
	const { run, encrypt, decrypt, push } = await dotsec();

	const asd = await push({
		using: "sec",
		commands: {
			push: {
				to: {
					"aws-ssm": [
						"WHTEVER,",
						{
							path: "/omg/watf",
							variable: "WIE_IS_JE_PAPA",
							changeCase: "pathCase",
						},
					],
				},
			},
		},
		// use 'inherit' to pass through the stdio
		// stdIoOptions: "inherit",
	});

	console.log(JSON.stringify(asd, null, 2));
	// const asd = await run({
	// 	using: "sec",
	// 	command: "env",
	// 	// use 'inherit' to pass through the stdio
	// 	// stdIoOptions: "inherit",
	// });

	// console.log(JSON.stringify(asd, null, 2));
	// const rawwww = await decrypt({
	// 	// envFile: "./.env",
	// 	secFile: "omg.sec",
	// 	write: false,
	// });

	// await rawwww.write();
	// console.log("rawwww", rawwww);
})();
