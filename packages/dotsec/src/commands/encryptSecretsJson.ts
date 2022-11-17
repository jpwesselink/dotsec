import fs from "node:fs";
import path from "node:path";

import { DescribeKeyCommand, EncryptCommand } from "@aws-sdk/client-kms";
import { redBright } from "chalk";
import flat from "flat";

import { commonCliOptions } from "../commonCliOptions";
import { getConfig } from "../lib/config-old";
import { handleCredentialsAndRegion } from "../lib/partial-commands/handleCredentialsAndRegion";
import { EncryptedSecrets, Secrets, YargsHandlerParams } from "../types";
import { fileExists, promptOverwriteIfFileExists } from "../utils/io";
import { getEncryptionAlgorithm, getKMSClient } from "../utils/kms";
import { emphasis, getLogger, strong } from "../utils/logger";
export const command = "encrypt-secrets-json";
export const desc = "Encrypts an unencrypted file";

export const builder = {
	"secrets-file": {
		string: true,
		describe: "filename of json file reading secrets",
		default: "secrets.json",
	},
	"encrypted-secrets-file": {
		string: true,
		describe: "filename of json file for writing encrypted secrets",
		default: "secrets.encrypted.json",
	},
	"aws-profile": commonCliOptions.awsProfile,
	"aws-region": commonCliOptions.awsRegion,
	"aws-key-alias": commonCliOptions.awsKeyAlias,
	"aws-assume-role-arn": commonCliOptions.awsAssumeRoleArn,
	"aws-assume-role-session-duration":
		commonCliOptions.awsAssumeRoleSessionDuration,
	verbose: commonCliOptions.verbose,
	yes: { ...commonCliOptions.yes },
} as const;

export const handler = async (
	argv: YargsHandlerParams<typeof builder>,
): Promise<void> => {
	const config = await getConfig();
	const { info, error } = getLogger();
	try {
		const { credentialsAndOrigin, regionAndOrigin } =
			await handleCredentialsAndRegion({
				argv: {
					...argv,
					awsRegion: config.aws.region || argv.awsRegion,
					awsProfile: config.aws.profile || argv.awsProfile,
					awsAssumeRoleArn: config.aws.assumeRoleArn || argv.awsAssumeRoleArn,
					awsAssumeRoleSessionDuration:
						config.aws.assumeRoleSessionDuration ||
						argv.awsAssumeRoleSessionDuration,
				},
				env: { ...process.env },
			});

		const secretsPath = path.resolve(process.cwd(), argv.secretsFile);
		if (!(await fileExists(secretsPath))) {
			error(`Could not open ${redBright(secretsPath)}`);
			return;
		}
		const secrets = JSON.parse(
			fs.readFileSync(secretsPath, { encoding: "utf8" }),
		) as Secrets;

		if (!secrets.parameters) {
			throw new Error(`Expected 'parameters' property, but got none`);
		}

		const flatParameters: Record<string, unknown> = flat(secrets.parameters, {
			delimiter: "/",
			maxDepth: config.maxDepth,
		});

		if (argv.verbose) {
			info(flatParameters);
		}
		const kmsClient = getKMSClient({
			configuration: {
				credentials: credentialsAndOrigin.value,
				region: regionAndOrigin.value,
			},
			verbose: argv.verbose,
		});

		const awsKeyAlias = argv.awsKeyAlias || config.aws.keyAlias;

		if (argv.verbose) {
			info(
				`Encrypting using key alias ${emphasis(awsKeyAlias)} in ${emphasis(
					await kmsClient.config.region(),
				)}`,
			);

			// describe key *once*

			const describeKeyCommand = new DescribeKeyCommand({
				KeyId: awsKeyAlias,
			});

			const describeKeyResult = await kmsClient.send(describeKeyCommand);

			info("keyMetaData", { ...describeKeyResult.KeyMetadata });
		}

		const encryptionAlgorithm = await getEncryptionAlgorithm(
			kmsClient,
			awsKeyAlias,
		);
		const encryptedFlatParameters = Object.fromEntries(
			await Promise.all(
				Object.entries(flatParameters).map(
					async ([parameterName, parameter]) => {
						// copy paramter to let
						let parameterCopy = parameter;
						// check if parameter is string, number or boolean, if not, encode to json
						if (
							typeof parameter !== "string" &&
							typeof parameter !== "number" &&
							typeof parameter !== "boolean"
						) {
							parameterCopy = JSON.stringify(parameter);
						}
						const encryptCommand = new EncryptCommand({
							KeyId: awsKeyAlias,
							Plaintext: Buffer.from(String(parameterCopy)),
							EncryptionAlgorithm: encryptionAlgorithm,
						});

						const encryptionResult = await kmsClient.send(encryptCommand);

						if (!encryptionResult.CiphertextBlob) {
							throw new Error(
								`Something bad happened: ${JSON.stringify({
									key: parameterName,
									value: parameter,
									encryptCommand,
								})}`,
							);
						}

						if (argv.verbose) {
							info(`Encrypting key ${emphasis(parameterName)} ${strong("ok")}`);
						}

						const cipherText = Buffer.from(
							encryptionResult.CiphertextBlob,
						).toString("base64");
						return [parameterName, cipherText];
					},
				),
			),
		) as Record<string, string>;

		const encryptedParameters: EncryptedSecrets["encryptedParameters"] =
			flat.unflatten(encryptedFlatParameters, { delimiter: "/" });
		const encryptedSecrets: EncryptedSecrets = {
			config: secrets.config,
			encryptedParameters,
		};

		const encryptedSecretsPath = path.resolve(
			process.cwd(),
			argv.encryptedSecretsFile,
		);
		const overwriteResponse = await promptOverwriteIfFileExists({
			filePath: encryptedSecretsPath,
			skip: argv.yes,
		});

		if (
			overwriteResponse === undefined ||
			overwriteResponse.overwrite === true
		) {
			fs.writeFileSync(
				encryptedSecretsPath,
				JSON.stringify(encryptedSecrets, null, 4),
			);
		}
	} catch (e) {
		error(e);
	}
};
