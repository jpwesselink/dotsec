import { secretsManagerAvailableCases } from "./constants";
import { awsEncryptionEngineFactory } from "./lib/awsEncryptionEngineFactory";
import { createAwsSecretsManagerExecutor } from "./lib/awsSecretsManagerExecutor";
import { createAwsSsmExecutor } from "./lib/awsSsmExecutor";
import { DotsecPluginAws, DotsecPluginModuleConfig } from "./types";
import { CreateSecretRequest } from "@aws-sdk/client-secrets-manager";
import { PutParameterRequest } from "@aws-sdk/client-ssm";
import * as changeCase from "change-case";
import {
	DotsecConfig,
	DotsecPluginModule,
	Table,
	promptExecute,
	resolveFromEnv,
} from "dotsec";

export const dotsecPluginAws: DotsecPluginModule<DotsecPluginModuleConfig> =
	async (options) => {
		const config = options.dotsecConfig as DotsecConfig<{
			plugins: DotsecPluginAws;
		}>;

		return {
			name: "aws",

			api: {
				getKmsKey: () => {
					return Promise.resolve("123");
				},
			},
			cliHandlers: {
				encrypt: {
					encryptionEngineName: "AWS KMS",
					triggerOptionValue: "aws",
					options: {
						awsKeyAlias: [
							"--aws-key-alias, --awsKeyAlias <awsKeyAlias>",
							"AWS KMS Key Alias",
						],
						awsRegion: ["--aws-region, --awsRegion <awsRegion>", "AWS region"],
					},
					handler: async ({ plaintext, awsKeyAlias, awsRegion }) => {
						const keyAlias =
							awsKeyAlias ||
							process.env.DOTSEC_AWS_KMS_KEY_ALIAS ||
							config.defaults?.plugins?.aws?.kms?.keyAlias ||
							"alias/dotsec";
						const region =
							awsRegion ||
							process.env.AWS_REGION ||
							process.env.DOTSEC_AWS_KMS_REGION ||
							config.defaults?.plugins?.aws?.region ||
							config.defaults?.plugins?.aws?.kms?.region ||
							"us-east-1";

						const encryptionPlugin = await awsEncryptionEngineFactory({
							verbose: true,
							kms: {
								keyAlias,
							},
							region,
						});

						return await encryptionPlugin.encrypt(plaintext);
					},
				},
				decrypt: {
					encryptionEngineName: "AWS KMS",
					triggerOptionValue: "aws",
					options: {
						awsKeyAlias: [
							"--aws-key-alias, --awsKeyAlias <awsKeyAlias>",
							"AWS KMS Key Alias",
						],
						awsRegion: ["--aws-region, --awsRegion <awsRegion>", "AWS region"],
					},
					handler: async ({ ciphertext, awsKeyAlias, awsRegion }) => {
						const keyAlias =
							awsKeyAlias ||
							process.env.DOTSEC_AWS_KMS_KEY_ALIAS ||
							config.defaults?.plugins?.aws?.kms?.keyAlias ||
							"alias/dotsec";
						const region =
							awsRegion ||
							process.env.AWS_REGION ||
							process.env.DOTSEC_AWS_KMS_REGION ||
							config.defaults?.plugins?.aws?.region ||
							config.defaults?.plugins?.aws?.kms?.region ||
							"us-east-1";
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
					options: {
						awsRegion: ["--aws-region, --awsRegion <awsRegion>", "AWS region"],
					},
					handler: async ({ variables, awsRegion, yes }) => {
						const ssmDefaultOptions = config?.defaults?.plugins?.aws?.ssm;

						const ssmDefaultParameterType =
							ssmDefaultOptions?.type || "SecureString";
						if (ssmDefaultParameterType) {
							// validate
							if (
								!["String", "SecureString"].includes(ssmDefaultParameterType)
							) {
								throw new Error(
									`Invalid global parameter type for ssm, must be 'String' or 'SecureString', but got ${ssmDefaultParameterType}`,
								);
							}
						}

						const ssmDefaultRegion = ssmDefaultOptions?.region || awsRegion;
						const ssmDefaultFromEnv = resolveFromEnv({
							env: process.env,
							fromEnvValue: ssmDefaultOptions?.pathPrefix,
							variables,
						});
						// validate that path prefix should start and end with a slash
						if (
							ssmDefaultFromEnv &&
							!ssmDefaultFromEnv.startsWith("/") &&
							!ssmDefaultFromEnv.endsWith("/")
						) {
							throw new Error(
								`Invalid global path prefix for ssm, must start and end with a slash, but got ${ssmDefaultFromEnv}`,
							);
						}

						const ssmDefaultChangeCase = ssmDefaultOptions?.changeCase;
						const ssmTransformCase = (str: string) => {
							if (ssmDefaultChangeCase) {
								return changeCase[ssmDefaultChangeCase](str);
							}
							return str;
						};
						// secrets manager defaults
						const secretsManagerDefaultOptions =
							config?.defaults?.plugins?.aws?.secretsManager;

						const secretsManagerDefaultFromEnv = resolveFromEnv({
							env: process.env,
							fromEnvValue: secretsManagerDefaultOptions?.pathPrefix,
							variables,
						});
						// validate that path prefix should start and end with a slash
						if (
							secretsManagerDefaultFromEnv &&
							!secretsManagerDefaultFromEnv.startsWith("/") &&
							!secretsManagerDefaultFromEnv.endsWith("/")
						) {
							throw new Error(
								`Invalid global path prefix for secrets manager, must start and end with a slash, but got ${secretsManagerDefaultFromEnv}`,
							);
						}

						const secretsManagerDefaultRegion =
							secretsManagerDefaultOptions?.region || awsRegion;

						const secretsManagerDefaultChangeCase =
							secretsManagerDefaultOptions?.changeCase;
						const secretsManagerTransformCase = (str: string) => {
							if (secretsManagerDefaultChangeCase) {
								if (!changeCase[secretsManagerDefaultChangeCase]) {
									throw new Error(
										`Invalid global change case for secrets manager, must be one of ${secretsManagerAvailableCases.join(
											", ",
										)}, but got ${secretsManagerDefaultChangeCase}`,
									);
								}
								return changeCase[secretsManagerDefaultChangeCase](str);
							}
							return str;
						};
						const tasks = Object.entries(variables).reduce<{
							ssm: (PutParameterRequest & {
								envVariableName: string;
							})[];
							secretsManager: (CreateSecretRequest & {
								envVariableName: string;
							})[];
						}>(
							(acc, [key, value]) => {
								const configVariable = config?.variables?.[key];
								if (configVariable) {
									if (configVariable.push?.aws?.ssm) {
										const ssmVariableDefaults =
											typeof configVariable.push?.aws?.ssm === "boolean"
												? {}
												: configVariable.push?.aws?.ssm;

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
											variables,
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
												(ssmVariableFromEnv || ssmDefaultFromEnv) +
												ssmParameterName,
											Value: value,
											Type: ssmVariableParameterType || ssmDefaultParameterType,
										});
									}
									if (configVariable.push?.aws?.secretsManager) {
										const secretsManagerPushOptions =
											typeof configVariable.push?.aws?.secretsManager ===
											"boolean"
												? {}
												: configVariable.push?.aws?.secretsManager;

										const secretsManagerVariableFromEnv = resolveFromEnv({
											env: process.env,
											fromEnvValue: secretsManagerPushOptions?.pathPrefix,
											variables,
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
												secretsManagerDefaultFromEnv) +
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
													secretsManagerDefaultFromEnv) +
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
								region: ssmDefaultRegion,
							});

							const { execute, putParameterOverview } =
								await awsSsmExecutor.put(tasks.ssm);

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
							}
						}
						if (tasks.secretsManager.length > 0) {
							const awsSecretsManagerExecutor =
								await createAwsSecretsManagerExecutor({
									region: secretsManagerDefaultRegion,
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
							}
						}
						return "asd";
					},
				},
				// addCliCommand: async ({ program }) => {
				// 	program
				// 		.enablePositionalOptions()
				// 		.passThroughOptions()
				// 		.command("aws")
				// 		.action(async () => {
				// 			console.log("OMG", config);
				// 		});
				// },
			},
		};
	};
