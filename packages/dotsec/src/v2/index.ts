import { createConfig, loadConfigFromFile } from "./config";
import { loadDotfile, parseDotfileContent, writeDotfile } from "./io";
import { decrypt } from "./lib/decypt";
import { awsEncryptionEngineFactory } from "./plugins/aws";
import {
	CommandParams,
	DecryptOptions,
	EncryptOptions,
	PushOptions,
	RunOptions,
} from "./types";
import { spawnSync } from "node:child_process";
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
	if (loadedConfig.envFile) {
		// add path relative to either options?.configFile or process.cwd()
		if (options?.configFile) {
			loadedConfig.envFile = path.resolve(
				path.dirname(options.configFile),
				loadedConfig.envFile,
			);
		} else {
			loadedConfig.envFile = path.resolve(process.cwd(), loadedConfig.envFile);
		}
	}
	const createConfigResult = createConfig(loadedConfig, options?.config);

	const { mergeConfig /*, config */ } = createConfigResult.unwrap();
	// initial config is available here

	return {
		encrypt: async (encryptOptions?: EncryptOptions) => {
			const commandConfigResult = mergeConfig(encryptOptions);

			const { config: commandConfig } = commandConfigResult.unwrap();
			// load the env / sec file
			const loadPlaintextResult = await loadDotfile(
				path.resolve(commandConfig.envFile),
			);

			const plaintextContent = loadPlaintextResult.unwrap();

			let ciphertextContent: string | undefined;

			const method =
				encryptOptions?.method || commandConfig.defaultEncryptionMethod;

			if (method === "aws-kms") {
				ciphertextContent = await (
					await awsEncryptionEngineFactory({
						kms: {
							keyAlias: commandConfig.aws.kms.keyAlias,
							region: commandConfig.aws.kms.region || commandConfig.aws.region,
						},
					})
				).encrypt(plaintextContent);
			}

			if (!ciphertextContent) {
				throw new Error("No ciphertext content available");
			}
			const writeOut = async () => {
				if (!ciphertextContent) {
					throw new Error("No ciphertext content available");
				}
				await writeDotfile(
					path.resolve(process.cwd(), commandConfig.secFile),
					ciphertextContent,
				);
			};
			if (encryptOptions?.write === true) {
				// write out to file
				await writeOut();
			}

			return {
				ciphertext: ciphertextContent,
				write: writeOut,
			};
		},

		decrypt: async (decryptOptions?: DecryptOptions) => {
			return decrypt({ decryptOptions, mergeConfig });
			// const commandConfigResult = mergeConfig(decryptOptions);

			// const { config: commandConfig } = commandConfigResult.unwrap();
			// // load the env / sec file
			// const loadCiphertextResult = await loadDotfile(
			// 	path.resolve(commandConfig.secFile),
			// );

			// const ciphertextContent = loadCiphertextResult.unwrap();

			// let plaintextContent: string | undefined;

			// const method =
			// 	decryptOptions?.method || commandConfig.defaultEncryptionMethod;

			// if (method === "aws-kms") {
			// 	plaintextContent = await (
			// 		await awsEncryptionEngineFactory({
			// 			kms: {
			// 				keyAlias: commandConfig.aws.kms.keyAlias,
			// 				region: commandConfig.aws.kms.region || commandConfig.aws.region,
			// 			},
			// 		})
			// 	).decrypt(ciphertextContent);
			// }

			// if (!plaintextContent) {
			// 	throw new Error("No plaintext content available");
			// }
			// const writeOut = async () => {
			// 	if (!plaintextContent) {
			// 		throw new Error("No plaintext content available");
			// 	}

			// 	await writeDotfile(
			// 		path.resolve(process.cwd(), commandConfig.envFile),
			// 		plaintextContent,
			// 	);
			// };
			// if (decryptOptions?.write === true) {
			// 	// write out to file
			// 	await writeOut();
			// }

			// const parsed = parse(plaintextContent);
			// const expanded = expand({
			// 	ignoreProcessEnv: true,
			// 	parsed: { ...parsed },
			// });
			// return {
			// 	write: writeOut,
			// 	parsed,
			// 	expanded: expanded.parsed,
			// 	plaintext: plaintextContent,
			// };
		},
		run: async (cmdOptions: RunOptions) => {
			const hahah = await decrypt({ decryptOptions: cmdOptions, mergeConfig });
			// const commandConfigResult = mergeConfig(cmdOptions);

			// const { config: commandConfig } = commandConfigResult.unwrap();

			// // load the env / sec file
			// const loadDotfileResult = await loadDotfile(
			// 	path.resolve(
			// 		process.cwd(),
			// 		cmdOptions.using === "env"
			// 			? commandConfig.envFile
			// 			: commandConfig.secFile,
			// 	),
			// );

			// const dotfileContent = loadDotfileResult.unwrap();

			// let plaintextDotfile: string | undefined;

			// if (cmdOptions.using === "env") {
			// 	plaintextDotfile = dotfileContent;
			// } else if (cmdOptions?.using === "sec") {
			// 	const method =
			// 		cmdOptions.method || commandConfig.defaultEncryptionMethod;

			// 	if (method === "aws-kms") {
			// 		plaintextDotfile = await (
			// 			await awsEncryptionEngineFactory({
			// 				kms: {
			// 					keyAlias: commandConfig.aws.kms.keyAlias,
			// 					region:
			// 						commandConfig.aws.kms.region || commandConfig.aws.region,
			// 				},
			// 			})
			// 		).decrypt(dotfileContent);
			// 	}
			// }

			// if (!plaintextDotfile) {
			// 	throw new Error("Unable to decrypt the file");
			// }

			// const parseDotfileResult = parseDotfileContent(plaintextDotfile);

			const dotenv: { [key: string]: string } = hahah.parsed;
			// run the command
			const commands = cmdOptions.command.split(" ");
			const [userCommand, ...userCommandArgs] = commands;
			const spawn = spawnSync(userCommand, [...userCommandArgs], {
				stdio: cmdOptions?.stdIoOptions,
				shell: false,
				encoding: "utf-8",
				env: {
					// ...expandedEnvVars.parsed,
					...dotenv,
					...process.env,
					__DOTSEC_ENV__: JSON.stringify(Object.keys(dotenv || {})),
				},
			});

			if (spawn.status !== 0) {
				process.exit(spawn.status || 1);
			}

			return spawn;
		},
		push: async (cmdOptions: PushOptions) => {
			const { expanded: dotenv, config } = await decrypt({
				decryptOptions: cmdOptions,
				mergeConfig,
			});

			// get push env vars
			Object.entries(config?.commands?.push?.to || {}).reduce(
				(acc, [pushTarget, pushValue]) => {
					console.log(pushTarget);

					if (pushTarget === "aws-ssm") {
						console.log("PUSH");
					}
					return acc;
				},
				{},
			);

			// read config file
			// const spawn = spawnSync(userCommand, [...userCommandArgs], {
			// 	stdio: cmdOptions?.stdIoOptions,
			// 	shell: false,
			// 	encoding: "utf-8",
			// 	env: {
			// 		// ...expandedEnvVars.parsed,
			// 		...dotenv,
			// 		...process.env,
			// 		__DOTSEC_ENV__: JSON.stringify(Object.keys(dotenv || {})),
			// 	},
			// });

			// if (spawn.status !== 0) {
			// 	process.exit(spawn.status || 1);
			// }
		},
	};
};

void (async () => {
	const { run, encrypt, decrypt, push } = await dotsec();

	const asd = await push({
		using: "sec",
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
