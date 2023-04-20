import {
	defaultRegion,
	secretsManagerAvailableCases,
	ssmAvailableCases,
} from "./constants";
import { awsEncryptionEngineFactory } from "./lib/awsEncryptionEngineFactory";
import { createAwsSecretsManagerExecutor } from "./lib/awsSecretsManagerExecutor";
import { createAwsSsmExecutor } from "./lib/awsSsmExecutor";
import { DotsecPluginAwsHandlers, expandObjectOrBoolean } from "./types";
import { CreateSecretRequest } from "@aws-sdk/client-secrets-manager";
import { PutParameterRequest } from "@aws-sdk/client-ssm";
import * as changeCase from "change-case";
import { Command } from "commander";
import * as url from "url";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
import {
	Table,
	promptExecute,
	promptOverwriteIfFileExists,
	readContentsFromFile,
	resolveFromEnv,
	strong,
	writeContentsToFile,
} from "dotsec";
import path from "node:path";

export const dotsecPluginAws: DotsecPluginAwsHandlers = async (options) => {
	const config = options.dotsecConfig;

	return {
		name: "aws",
		cliHandlers: {
			encrypt: {
				encryptionEngineName: "AWS KMS",
				triggerOptionValue: "aws",
				options: {
					awsKeyAlias: {
						flags: "--aws-key-alias, --awsKeyAlias <awsKeyAlias>",
						description: "AWS KMS Key Alias",
						env: "AWS_KEY_ALIAS",
					},
					awsRegion: {
						flags: "--aws-region, --awsRegion <awsRegion>",
						description: "AWS region",
						env: "AWS_REGION",
					},
				},
				handler: async ({ plaintext, ciphertext, awsKeyAlias, awsRegion }) => {
					const keyAlias =
						awsKeyAlias ||
						process.env.AWS_KEY_ALIAS ||
						config.defaults?.plugins?.aws?.kms?.keyAlias ||
						"alias/dotsec";

					const region =
						awsRegion ||
						process.env.AWS_REGION ||
						process.env.AWS_KMS_REGION ||
						config.defaults?.plugins?.aws?.kms?.region ||
						config.defaults?.plugins?.aws?.region ||
						defaultRegion;

					const encryptionPlugin = await awsEncryptionEngineFactory({
						verbose: true,
						kms: {
							keyAlias,
						},
						region,
					});

					return await encryptionPlugin.encrypt(plaintext, ciphertext);
				},
			},
			decrypt: {
				encryptionEngineName: "AWS KMS",
				triggerOptionValue: "aws",
				options: {
					awsKeyAlias: {
						flags: "--aws-key-alias, --awsKeyAlias <awsKeyAlias>",
						description: "AWS KMS Key Alias",
						env: "AWS_KEY_ALIAS",
					},
					awsRegion: {
						flags: "--aws-region, --awsRegion <awsRegion>",
						description: "AWS region",
						env: "AWS_REGION",
					},
					awsKmsRegion: {
						flags: "--aws-kms-region, --awsKmsRegion <awsKmsRegion>",
						description: "AWS KMS region",
						env: "AWS_KMS_REGION",
					},
				},
				handler: async ({
					ciphertext,
					awsKeyAlias,
					awsRegion,
					awsKmsRegion,
				}) => {
					const keyAlias =
						awsKeyAlias ||
						process.env.AWS_KMS_KEY_ALIAS ||
						config.defaults?.plugins?.aws?.kms?.keyAlias ||
						"alias/dotsec";
					const region =
						awsRegion ||
						awsKmsRegion ||
						process.env.AWS_REGION ||
						process.env.AWS_KMS_REGION ||
						config.defaults?.plugins?.aws?.kms?.region ||
						config.defaults?.plugins?.aws?.region ||
						defaultRegion;

					const encryptionPlugin = await awsEncryptionEngineFactory({
						verbose: true,
						kms: {
							keyAlias,
						},
						region,
					});

					return await encryptionPlugin.decrypt(ciphertext);
				},
			},
			push: {
				triggerOptionValue: "aws",
				usage: 'do stuff with "aws"',
				description:
					"Pushes .env or .sec files to AWS SSM or AWS Secrets Manager",
				options: {
					awsSsmChangeCase: {
						flags:
							"--aws-ssm-change-case, --awsSsmChangeCase <awsSsmChangeCase>",
						description: "Change case for AWS SSM parameter names",
						env: "AWS_SSM_CHANGE_CASE",
						choices: [...ssmAvailableCases],
					},
					awsRegion: {
						flags: "--aws-region, --awsRegion <awsRegion>",
						description: "AWS region, overrides awsRegion",
						env: "AWS_REGION",
					},
					awsSsmRegion: {
						flags: "--aws-ssm-region, --awsSsmRegion <awsSsmRegion>",
						description: "AWS SSM region, overrides awsRegion",
						env: "AWS_SSM_REGION",
					},
					awsSecretsManagerChangeCase: {
						flags:
							"--aws-secrets-manager-change-case, --awsSecretsManagerChangeCase <awsSecretsManagerChangeCase>",
						description: "Change case for AWS Secrets Manager secret names",
						env: "AWS_SECRETS_MANAGER_CHANGE_CASE",
						choices: [...secretsManagerAvailableCases],
					},
					awsSecretsManagerRegion: {
						flags:
							"--aws-secrets-manager-region, --awsSecretsManagerRegion <awsSecretsManagerRegion>",
						description: "AWS Secrets Manager region, overrides awsRegion",
						env: "AWS_SECRETS_MANAGER_REGION",
					},
				},
				handler: async ({
					push,
					awsRegion,
					awsSsmRegion,
					awsSsmPathPrefix,
					awsSsmChangeCase,
					awsSsmType,
					awsSecretsManagerRegion,
					awsSecretsManagerPathPrefix,
					awsSecretsManagerChangeCase,
					yes,
				}) => {
					const ssmDefaultOptions = config?.defaults?.plugins?.aws?.ssm;
					const ssmRegion =
						awsSsmRegion ||
						// cli option
						awsRegion ||
						// aws plugin ssm config default
						ssmDefaultOptions?.region ||
						// aws plugin config default
						config.defaults?.plugins?.aws?.region ||
						// default
						defaultRegion;

					const ssmParameterType =
						awsSsmType || ssmDefaultOptions?.type || "String";

					const ssmPathPrefixFromEnv = resolveFromEnv({
						env: process.env,
						fromEnvValue: awsSsmPathPrefix || ssmDefaultOptions?.pathPrefix,
						variables: push,
					});

					if (ssmParameterType) {
						// validate
						if (!["String", "SecureString"].includes(ssmParameterType)) {
							throw new Error(
								`Invalid global parameter type for ssm, must be 'String' or 'SecureString', but got ${ssmParameterType}`,
							);
						}
					} else {
						throw new Error(
							`Invalid global parameter type for ssm, must be 'String' or 'SecureString', but got ${ssmParameterType}`,
						);
					}

					// validate that path prefix should start and end with a slash
					if (
						ssmPathPrefixFromEnv &&
						!ssmPathPrefixFromEnv.startsWith("/") &&
						!ssmPathPrefixFromEnv.endsWith("/")
					) {
						throw new Error(
							`Invalid global path prefix for ssm, must start and end with a slash, but got ${ssmPathPrefixFromEnv}`,
						);
					}

					const ssmChangeCase =
						awsSsmChangeCase || ssmDefaultOptions?.changeCase;
					const ssmTransformCase = (str: string) => {
						if (ssmChangeCase) {
							return changeCase[ssmChangeCase](str);
						}
						return str;
					};
					// secrets manager
					// secrets manager defaults
					const secretsManagerDefaultOptions =
						config?.defaults?.plugins?.aws?.secretsManager;
					const secretsManagerRegion =
						// cli option
						awsSecretsManagerRegion ||
						awsRegion ||
						secretsManagerDefaultOptions?.region ||
						config.defaults?.plugins?.aws?.region ||
						defaultRegion;

					const secretsManagerPathPrefixFromEnv = resolveFromEnv({
						env: process.env,
						fromEnvValue:
							awsSecretsManagerPathPrefix ||
							secretsManagerDefaultOptions?.pathPrefix,
						variables: push,
					});
					// validate that path prefix should start and end with a slash
					if (
						secretsManagerPathPrefixFromEnv &&
						!secretsManagerPathPrefixFromEnv.startsWith("/") &&
						!secretsManagerPathPrefixFromEnv.endsWith("/")
					) {
						throw new Error(
							`Invalid global path prefix for secrets manager, must start and end with a slash, but got ${secretsManagerPathPrefixFromEnv}`,
						);
					}

					const secretsManagerChangeCase =
						awsSecretsManagerChangeCase ||
						secretsManagerDefaultOptions?.changeCase;
					const secretsManagerTransformCase = (str: string) => {
						if (secretsManagerChangeCase) {
							if (!changeCase[secretsManagerChangeCase]) {
								throw new Error(
									`Invalid global change case for secrets manager, must be one of ${secretsManagerAvailableCases.join(
										", ",
									)}, but got ${secretsManagerChangeCase}`,
								);
							}
							return changeCase[secretsManagerChangeCase](str);
						}
						return str;
					};
					const tasks = Object.entries(push).reduce<{
						ssm: (PutParameterRequest & {
							envVariableName: string;
						})[];
						secretsManager: (CreateSecretRequest & {
							envVariableName: string;
						})[];
					}>(
						(acc, [key, value]) => {
							const configVariable = config?.push?.[key];
							if (configVariable) {
								if (configVariable?.aws?.ssm) {
									// unbox boolean
									const ssmVariableDefaults = expandObjectOrBoolean(
										configVariable?.aws?.ssm,
									);

									const ssmVariableParameterType = ssmVariableDefaults?.type;
									const ssmVariableName = ssmVariableDefaults?.name;

									if (ssmVariableParameterType) {
										// validate
										if (
											!["String", "SecureString"].includes(
												ssmVariableParameterType,
											)
										) {
											throw new Error(
												`Invalid parameter type for ssm, must be 'String' or 'SecureString', but got ${ssmVariableParameterType}`,
											);
										}
									}
									const ssmVariableFromEnv = resolveFromEnv({
										env: process.env,
										fromEnvValue: ssmVariableDefaults?.pathPrefix,
										variables: push,
									});

									// validate that path prefix should start and end with a slash
									if (
										ssmVariableFromEnv &&
										!ssmVariableFromEnv.startsWith("/") &&
										!ssmVariableFromEnv.endsWith("/")
									) {
										throw new Error(
											`Invalid path prefix for ssm, must start and end with a slash, but got ${ssmVariableFromEnv}`,
										);
									}

									const ssmParameterName = ssmTransformCase(
										ssmVariableName || key,
									);
									// push to ssm
									acc["ssm"].push({
										envVariableName: key,
										Name:
											(ssmVariableFromEnv || ssmPathPrefixFromEnv) +
											ssmParameterName,
										Value: value,
										Type: ssmVariableParameterType || ssmParameterType,
									});
								}
								if (configVariable?.aws?.secretsManager) {
									const secretsManagerPushOptions = expandObjectOrBoolean(
										configVariable?.aws?.secretsManager,
									);

									const secretsManagerVariableFromEnv = resolveFromEnv({
										env: process.env,
										fromEnvValue: secretsManagerPushOptions?.pathPrefix,
										variables: push,
									});

									const secretsManagerVariableName =
										secretsManagerPushOptions?.name;

									// validate that path prefix should start and end with a slash
									if (
										secretsManagerVariableFromEnv &&
										!secretsManagerVariableFromEnv.startsWith("/") &&
										!secretsManagerVariableFromEnv.endsWith("/")
									) {
										throw new Error(
											`Invalid path prefix for secrets manager, must start and end with a slash, but got ${secretsManagerVariableFromEnv}`,
										);
									}

									const secretsManagerParameterName =
										secretsManagerTransformCase(
											secretsManagerVariableName || key,
										);

									const secretName =
										(secretsManagerVariableFromEnv ||
											secretsManagerPathPrefixFromEnv) +
										secretsManagerParameterName;

									if (secretName.match(/^[A-Za-z0-9-/_.+=@]*$/) === null) {
										throw new Error(
											`Invalid secret name for secrets manager, must match the regular expression [A-Za-z0-9-/_.+=@]*, but got ${secretName}`,
										);
									}

									// push to secrets manager
									acc["secretsManager"].push({
										envVariableName: key,
										Name:
											(secretsManagerVariableFromEnv ||
												secretsManagerPathPrefixFromEnv) +
											secretsManagerParameterName,
										SecretString: value,
									});
								}
							}

							return acc;
						},
						{ ssm: [], secretsManager: [] },
					);

					if (tasks.ssm.length > 0) {
						const awsSsmExecutor = await createAwsSsmExecutor({
							region: ssmRegion,
						});

						const { execute, putParameterOverview } = await awsSsmExecutor.put(
							tasks.ssm,
						);

						if (putParameterOverview.length > 0) {
							const table = new Table({
								head: ["Env variable", "Name", "Type", "Region"],
							});
							table.push(
								...putParameterOverview.map((row) => Object.values(row)),
							);
							await promptExecute({
								message: `Are you sure you want to put the following variables in AWS SSM Parameter Store?
${table.toString()}
`,
								skip: yes,
								execute: async () => {
									await execute();
								},
							});

							if (yes === true) {
								console.log(
									"The following variables were put in AWS SSM Parameter Store:",
								);
								console.log(table.toString());
							}
						}
					}
					if (tasks.secretsManager.length > 0) {
						const awsSecretsManagerExecutor =
							await createAwsSecretsManagerExecutor({
								region: secretsManagerRegion,
							});
						const { execute, createOrUpdateSecretsOverview } =
							await awsSecretsManagerExecutor.createOrUpdateSecrets(
								tasks.secretsManager,
							);

						if (createOrUpdateSecretsOverview.length > 0) {
							const table = new Table({
								head: ["Env variable", "Operation", "Name", "Region"],
							});
							table.push(
								...createOrUpdateSecretsOverview.map((row) =>
									Object.values(row),
								),
							);
							await promptExecute({
								message: `Are you sure you want to create/update the following variables in AWS Secrets Manager?
${table.toString()}
`,
								skip: yes,
								execute: async () => {
									await execute();
								},
							});

							if (yes === true) {
								console.log(
									"The following variables were created/updated in AWS Secrets Manager:",
								);
								console.log(table.toString());
							}
						}
					}

					// return string, why
					return "";
				},
			},
		},
		addCliCommand: async ({ program }) => {
			const subProgram = program
				.enablePositionalOptions()
				.passThroughOptions()
				.command("aws");

			subProgram
				.command("init")
				.description("Init dotsec config file with AWS plugin")
				.option("--yes", "Skip confirmation")
				.action(async (_options, command: Command) => {
					const { configFile = "dotsec.config.ts", yes } =
						// @ts-ignore
						command.optsWithGlobals<{
							configFile: string;
							yes: boolean;
						}>();

					try {
						// read config file from ./templates/dotsec.config.ts
						const configTemplate = await readContentsFromFile(
							path.resolve(__dirname, "../src/templates/dotsec.config.ts"),
						);

						const dotsecConfigOverwriteResponse =
							await promptOverwriteIfFileExists({
								filePath: configFile,
								skip: yes,
							});
						if (
							dotsecConfigOverwriteResponse === undefined ||
							dotsecConfigOverwriteResponse.overwrite === true
						) {
							await writeContentsToFile(
								path.resolve(process.cwd(), configFile),
								configTemplate,
							);

							console.log(`Wrote config file to ${strong(configFile)}`);
						}
					} catch (e) {
						command.error(e);
					}
				});
		},
	};
};
