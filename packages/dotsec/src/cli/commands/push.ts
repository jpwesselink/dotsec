import { Command } from "commander";
import { awsEncryptionEngineFactory } from "../../lib/aws/AwsKmsEncryptionEngine";
import { EncryptionEngine, isBoolean, PushCommandOptions } from "../../types";
import fs from "node:fs";

import { getConfig } from "../../lib/config";
import { setProgramOptions } from "../options";
import {
	DOTSEC_DEFAULT_DOTENV_FILENAME,
	DOTSEC_DEFAULT_DOTSEC_FILENAME,
} from "../../constants";
import { parse } from "dotenv";
import { PutParameterRequest } from "@aws-sdk/client-ssm";
import { strong } from "../../utils/logger";
import { promptConfirm } from "../../utils/prompts";
import { AwsSsm } from "../../lib/aws/AwsSsm";
import { AwsSecretsManager } from "../../lib/aws/AwsSecretsManager";
import { CreateSecretRequest } from "@aws-sdk/client-secrets-manager";

const addPushProgram = async (program: Command) => {
	const subProgram = program
		.enablePositionalOptions()
		.passThroughOptions()
		.command("push")
		.action(async (_options, command: Command) => {
			const {
				configFile,
				verbose,
				env,
				sec,
				awskeyAlias,
				awsRegion,
				yes,
				toAwsSsm,
				toAwsSecretsManager,
				toGitHubActionsSecrets,
			} = command.optsWithGlobals<PushCommandOptions>();
			if (!(toAwsSsm || toAwsSecretsManager || toGitHubActionsSecrets)) {
				throw new Error(
					"You must specify at least one of --to-aws-ssm, --to-aws-secrets-manager or --to-github-actions-secrets",
				);
			}
			const { contents: dotsecConfig } = await getConfig(configFile);

			let envContents: string | undefined;

			if (env) {
				const dotenvFilename = isBoolean(env)
					? DOTSEC_DEFAULT_DOTENV_FILENAME
					: env;
				envContents = fs.readFileSync(dotenvFilename, "utf8");
			} else if (sec) {
				const dotsecFilename = isBoolean(sec)
					? DOTSEC_DEFAULT_DOTSEC_FILENAME
					: sec;
				const dotSecContents = fs.readFileSync(dotsecFilename, "utf8");
				const encryptionEngine = await awsEncryptionEngineFactory({
					verbose,
					region:
						awsRegion ||
						process.env.AWS_REGION ||
						dotsecConfig.config?.aws?.region,
					kms: {
						keyAlias: awskeyAlias || dotsecConfig?.config?.aws?.kms?.keyAlias,
					},
				});

				envContents = await encryptionEngine.decrypt(dotSecContents);
			} else {
				throw new Error('Must provide either "--env" or "--sec"');
			}

			const envObject = parse(envContents);

			// get dotsec config
			try {
				if (toAwsSsm) {
					const ssmDefaults = dotsecConfig?.config?.aws?.ssm;
					const ssmType = ssmDefaults?.parameterType || "SecureString";

					const pathPrefix = ssmDefaults?.pathPrefix || "";
					const putParameterRequests = Object.entries(envObject).reduce<
						PutParameterRequest[]
					>((acc, [key, value]) => {
						if (dotsecConfig.variables?.[key]) {
							const entry = dotsecConfig.variables?.[key];
							if (entry) {
								const keyName = `${pathPrefix}${key}`;
								if (entry.push?.aws?.ssm) {
									const putParameterRequest: PutParameterRequest = isBoolean(
										entry.push.aws.ssm,
									)
										? {
												Name: keyName,
												Value: value,
												Type: ssmType,
										  }
										: {
												Name: keyName,
												Type: ssmType,
												...entry.push.aws.ssm,
												Value: value,
										  };

									acc.push(putParameterRequest);
									// return putParameterRequest;
								}
							}
						}

						return acc;
					}, []);

					const { confirm } = await promptConfirm({
						message: `Are you sure you want to push the following variables to AWS SSM Parameter Store?
${putParameterRequests
	.map(({ Name }) => `- ${strong(Name || "[no name]")}`)
	.join("\n")}`,
						skip: yes,
					});

					if (confirm === true) {
						console.log("pushing to AWS SSM Parameter Store");
						const meh = await AwsSsm({
							region: awsRegion || dotsecConfig?.config?.aws?.region,
						});

						await meh.put(putParameterRequests);
					}
				}

				// secrets manager
				if (toAwsSecretsManager) {
					// create secretss
					const secretsManagerDefaults =
						dotsecConfig?.config?.aws?.secretsManager;
					const pathPrefix = secretsManagerDefaults?.pathPrefix || "";
					const awsSecretsMananger = await AwsSecretsManager({
						region:
							awsRegion ||
							process.env.AWS_REGION ||
							dotsecConfig.config?.aws?.region,
					});

					const createSecretRequests = Object.entries(envObject).reduce<
						CreateSecretRequest[]
					>((acc, [key, value]) => {
						if (dotsecConfig.variables?.[key]) {
							const entry = dotsecConfig.variables?.[key];
							if (entry) {
								const keyName = `${pathPrefix}${key}`;
								if (entry.push?.aws?.ssm) {
									const createSecretRequest: CreateSecretRequest = isBoolean(
										entry.push.aws.ssm,
									)
										? {
												Name: keyName,
												SecretString: value,
										  }
										: {
												Name: keyName,
												...entry.push.aws.ssm,
												SecretString: value,
										  };

									acc.push(createSecretRequest);
								}
							}
						}

						return acc;
					}, []);
					const { push, updateSecretCommands, createSecretCommands } =
						await awsSecretsMananger.push(createSecretRequests);
					const confirmations: boolean[] = [];
					if (updateSecretCommands.length > 0) {
						const { confirm: confirmUpdate } = await promptConfirm({
							message: `Are you sure you want to update the following variables to AWS SSM Secrets Manager?
${updateSecretCommands
	.map(({ input: { SecretId } }) => `- ${strong(SecretId || "[no name]")}`)
	.join("\n")}`,
							skip: yes,
						});

						confirmations.push(confirmUpdate);
					}
					if (createSecretCommands.length > 0) {
						const { confirm: confirmCreate } = await promptConfirm({
							message: `Are you sure you want to create the following variables to AWS SSM Secrets Manager?
${createSecretCommands
	.map(({ input: { Name } }) => `- ${strong(Name || "[no name]")}`)
	.join("\n")}`,
							skip: yes,
						});

						confirmations.push(confirmCreate);
					}
					if (confirmations.find((c) => c === false) === undefined) {
						console.log("xpushing to AWS Secrets Manager");

						await push();
					}
				}

				if (toGitHubActionsSecrets) {
					// which env vars should we push to github actions secrets?
					const githubActionsSecrets = Object.entries(envObject).reduce<
						{ name: string; value: string }[]
					>((acc, [key, value]) => {
						if (dotsecConfig.variables?.[key]) {
							const entry = dotsecConfig.variables?.[key];
							if (entry) {
								if (entry.push?.github?.actionsSecrets) {
									acc.push({
										name: key,
										value,
									});
								}
							}
						}

						return acc;
					}, []);

					console.log("githubActionsSecrets", githubActionsSecrets);
				}
			} catch (e) {
				command.error(e);
			}
		});

	setProgramOptions(subProgram);

	return subProgram;
};

export default addPushProgram;
