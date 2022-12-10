import { PushCommandOptions } from "../../types";
import { DotsecConfig } from "../../types/config";
import {
	DotsecCliPluginDecryptHandler,
	DotsecCliPluginPushHandler,
} from "../../types/plugin";
import { setProgramOptions } from "../options";
import { Command } from "commander";
import { parse } from "dotenv";
import fs from "node:fs";

/**
 * Decrypts, and pushes the contents of a .env file to AWS SSM, AWS Secrets Manager or GitHub Actions Secrets
 * @date 12/7/2022 - 9:16:48 AM
 *
 * @async
 * @param {Command} program
 * @returns {unknown}
 */
const addPushProgram = async (
	program: Command,
	options: {
		dotsecConfig: DotsecConfig;
		handlers: {
			push: DotsecCliPluginPushHandler;
			decrypt: DotsecCliPluginDecryptHandler;
		}[];
	},
) => {
	const { dotsecConfig, handlers } = options;

	const subProgram = program
		.enablePositionalOptions()
		.passThroughOptions()
		.command("push")
		.action(async (_options: Record<string, string>, command: Command) => {
			try {
				const {
					// verbose,
					env: dotenv,
					sec: dotsec,
					withEnv,
					withSec,
					engine,
					yes,
				} = command.optsWithGlobals<PushCommandOptions>();

				const encryptionEngine =
					engine || dotsecConfig?.defaults?.encryptionEngine;

				const pluginCliDecrypt = (handlers || []).find((handler) => {
					return handler.decrypt?.triggerOptionValue === encryptionEngine;
				})?.decrypt;

				const pluginCliPush = (handlers || []).find((handler) => {
					return handler.push?.triggerOptionValue === encryptionEngine;
				})?.push;

				if (!pluginCliPush) {
					throw new Error("No push plugin found!");
				}

				const allOptionKeys = [
					...Object.keys(pluginCliDecrypt?.options || {}),
					...Object.keys(pluginCliDecrypt?.requiredOptions || {}),
					...Object.keys(pluginCliPush?.options || {}),
					...Object.keys(pluginCliPush?.requiredOptions || {}),
				];

				const allOptionsValues = Object.fromEntries(
					allOptionKeys.map((key) => {
						return [key, _options[key]];
					}),
				);

				if (withEnv && withSec) {
					throw new Error("Cannot use both --with-env and --with-sec");
				}

				let envContents: string | undefined;

				if (withEnv || !(withEnv || withSec)) {
					if (!dotenv) {
						throw new Error("No dotenv file specified in --env option");
					}
					envContents = fs.readFileSync(dotenv, "utf8");
				} else if (withSec) {
					if (!dotsec) {
						throw new Error("No dotsec file specified in --sec option");
					}

					if (!pluginCliDecrypt) {
						throw new Error(
							`No decryption plugin found, available decryption engine(s): ${handlers
								.map((e) => `--${e.decrypt?.triggerOptionValue}`)
								.join(", ")}`,
						);
					}

					const dotSecContents = fs.readFileSync(dotsec, "utf8");
					envContents = await pluginCliDecrypt.handler({
						ciphertext: dotSecContents,
						...allOptionsValues,
					});
				}
				if (envContents) {
					// convert to object
					const envObject = parse(envContents);
					await pluginCliPush.handler({
						variables: envObject,
						yes,
						...allOptionsValues,
					});
				} else {
					throw new Error("No .env or .sec file provided");
				}

				// 			let envContents: string | undefined;

				// 			if (env) {
				// 				const dotenvFilename = isBoolean(env)
				// 					? DOTSEC_DEFAULT_DOTENV_FILENAME
				// 					: env;
				// 				envContents = fs.readFileSync(dotenvFilename, "utf8");
				// 			} else if (sec) {
				// 				const dotsecFilename = isBoolean(sec)
				// 					? DOTSEC_DEFAULT_DOTSEC_FILENAME
				// 					: sec;
				// 				const dotSecContents = fs.readFileSync(dotsecFilename, "utf8");
				// 				const encryptionEngine = await awsEncryptionEngineFactory({
				// 					verbose,
				// 					region:
				// 						awsRegion ||
				// 						process.env.AWS_REGION ||
				// 						dotsecConfig.config?.aws?.region,
				// 					kms: {
				// 						keyAlias: awskeyAlias || dotsecConfig?.config?.aws?.kms?.keyAlias,
				// 					},
				// 				});

				// 				envContents = await encryptionEngine.decrypt(dotSecContents);
				// 			} else {
				// 				throw new Error('Must provide either "--env" or "--sec"');
				// 			}

				// 			const envObject = parse(envContents);

				// 			// get dotsec config
				// 			try {
				// 				if (toAwsSsm) {
				// 					const ssmDefaults = dotsecConfig?.config?.aws?.ssm;
				// 					const ssmType = ssmDefaults?.parameterType || "SecureString";

				// 					const pathPrefix = ssmDefaults?.pathPrefix || "";
				// 					const putParameterRequests = Object.entries(envObject).reduce<
				// 						PutParameterRequest[]
				// 					>((acc, [key, value]) => {
				// 						if (dotsecConfig.variables?.[key]) {
				// 							const entry = dotsecConfig.variables?.[key];
				// 							if (entry) {
				// 								const keyName = `${pathPrefix}${key}`;
				// 								if (entry.push?.aws?.ssm) {
				// 									const putParameterRequest: PutParameterRequest = isBoolean(
				// 										entry.push.aws.ssm,
				// 									)
				// 										? {
				// 												Name: keyName,
				// 												Value: value,
				// 												Type: ssmType,
				// 										  }
				// 										: {
				// 												Name: keyName,
				// 												Type: ssmType,
				// 												...entry.push.aws.ssm,
				// 												Value: value,
				// 										  };

				// 									acc.push(putParameterRequest);
				// 									// return putParameterRequest;
				// 								}
				// 							}
				// 						}

				// 						return acc;
				// 					}, []);

				// 					const { confirm } = await promptConfirm({
				// 						message: `Are you sure you want to push the following variables to AWS SSM Parameter Store?
				// ${putParameterRequests
				// 	.map(({ Name }) => `- ${strong(Name || "[no name]")}`)
				// 	.join("\n")}`,
				// 						skip: yes,
				// 					});

				// 					if (confirm === true) {
				// 						console.log("pushing to AWS SSM Parameter Store");
				// 						const meh = await AwsSsm({
				// 							region: awsRegion || dotsecConfig?.config?.aws?.region,
				// 						});

				// 						await meh.put(putParameterRequests);
				// 					}
				// 				}

				// 				// secrets manager
				// 				if (toAwsSecretsManager) {
				// 					// create secretss
				// 					const secretsManagerDefaults =
				// 						dotsecConfig?.config?.aws?.secretsManager;
				// 					const pathPrefix = secretsManagerDefaults?.pathPrefix || "";
				// 					const awsSecretsMananger = await AwsSecretsManager({
				// 						region:
				// 							awsRegion ||
				// 							process.env.AWS_REGION ||
				// 							dotsecConfig.config?.aws?.region,
				// 					});

				// 					const createSecretRequests = Object.entries(envObject).reduce<
				// 						CreateSecretRequest[]
				// 					>((acc, [key, value]) => {
				// 						if (dotsecConfig.variables?.[key]) {
				// 							const entry = dotsecConfig.variables?.[key];
				// 							if (entry) {
				// 								const keyName = `${pathPrefix}${key}`;
				// 								if (entry.push?.aws?.ssm) {
				// 									const createSecretRequest: CreateSecretRequest = isBoolean(
				// 										entry.push.aws.ssm,
				// 									)
				// 										? {
				// 												Name: keyName,
				// 												SecretString: value,
				// 										  }
				// 										: {
				// 												Name: keyName,
				// 												...entry.push.aws.ssm,
				// 												SecretString: value,
				// 										  };

				// 									acc.push(createSecretRequest);
				// 								}
				// 							}
				// 						}

				// 						return acc;
				// 					}, []);
				// 					const { push, updateSecretCommands, createSecretCommands } =
				// 						await awsSecretsMananger.push(createSecretRequests);
				// 					const confirmations: boolean[] = [];
				// 					if (updateSecretCommands.length > 0) {
				// 						const { confirm: confirmUpdate } = await promptConfirm({
				// 							message: `Are you sure you want to update the following variables to AWS SSM Secrets Manager?
				// ${updateSecretCommands
				// 	.map(({ input: { SecretId } }) => `- ${strong(SecretId || "[no name]")}`)
				// 	.join("\n")}`,
				// 							skip: yes,
				// 						});

				// 						confirmations.push(confirmUpdate);
				// 					}
				// 					if (createSecretCommands.length > 0) {
				// 						const { confirm: confirmCreate } = await promptConfirm({
				// 							message: `Are you sure you want to create the following variables to AWS SSM Secrets Manager?
				// ${createSecretCommands
				// 	.map(({ input: { Name } }) => `- ${strong(Name || "[no name]")}`)
				// 	.join("\n")}`,
				// 							skip: yes,
				// 						});

				// 						confirmations.push(confirmCreate);
				// 					}
				// 					if (confirmations.find((c) => c === false) === undefined) {
				// 						console.log("xpushing to AWS Secrets Manager");

				// 						await push();
				// 					}
				// 				}

				// 				if (toGitHubActionsSecrets) {
				// 					// which env vars should we push to github actions secrets?
				// 					const githubActionsSecrets = Object.entries(envObject).reduce<
				// 						{ name: string; value: string }[]
				// 					>((acc, [key, value]) => {
				// 						if (dotsecConfig.variables?.[key]) {
				// 							const entry = dotsecConfig.variables?.[key];
				// 							if (entry) {
				// 								if (entry.push?.github?.actionsSecrets) {
				// 									acc.push({
				// 										name: key,
				// 										value,
				// 									});
				// 								}
				// 							}
				// 						}

				// 						return acc;
				// 					}, []);

				// 					console.log("githubActionsSecrets", githubActionsSecrets);
				// 				}
				// 			} catch (e) {
				// 				command.error(e);
				// 			}
			} catch (e) {
				console.error(e);
				process.exit(1);
			}
		});

	setProgramOptions(subProgram);

	return subProgram;
};

export default addPushProgram;
