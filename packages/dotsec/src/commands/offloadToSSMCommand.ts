import fs from "node:fs";
import path from "node:path";

import { DecryptCommand } from "@aws-sdk/client-kms";
import { ParameterType, PutParameterCommand } from "@aws-sdk/client-ssm";
import { redBright } from "chalk";
import flat from "flat";

import { commonCliOptions } from "../commonCliOptions";
import { getConfig } from "../lib/config-old";
import { handleCredentialsAndRegion } from "../lib/partial-commands/handleCredentialsAndRegion";
import { EncryptedSecrets, YargsHandlerParams } from "../types";
import { fileExists } from "../utils/io";
import { getEncryptionAlgorithm, getKMSClient } from "../utils/kms";
import { emphasis, getLogger, strong } from "../utils/logger";
import { getSSMClient } from "../utils/ssm";
export const command = "offload-secrets-json-to-ssm";
export const desc =
	"Sends decrypted values of secrets.encrypted.json file to SSM parameter store";

export const builder = {
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

		const encryptedSecretsPath = path.resolve(
			process.cwd(),
			argv.encryptedSecretsFile,
		);
		if (!(await fileExists(encryptedSecretsPath))) {
			error(`Could not open ${redBright(encryptedSecretsPath)}`);
			return;
		}
		const encryptedSecrets = JSON.parse(
			fs.readFileSync(encryptedSecretsPath, { encoding: "utf8" }),
		) as EncryptedSecrets;

		if (!encryptedSecrets.encryptedParameters) {
			throw new Error(`Expected 'encryptedParameters' property, but got none`);
		}

		const flatEncryptedParameters: Record<string, string> = flat(
			encryptedSecrets.encryptedParameters,
			{ delimiter: "/" },
		);

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
		}

		const encryptionAlgorithm = await getEncryptionAlgorithm(
			kmsClient,
			awsKeyAlias,
		);

		const flatParameters = Object.fromEntries(
			await Promise.all(
				Object.entries(flatEncryptedParameters).map(
					async ([parameterName, encryptedParameter]) => {
						const decryptCommand = new DecryptCommand({
							KeyId: argv.awsKeyAlias,
							CiphertextBlob: Buffer.from(encryptedParameter, "base64"),
							EncryptionAlgorithm: encryptionAlgorithm,
						});

						const decryptionResult = await kmsClient.send(decryptCommand);

						if (!decryptionResult.Plaintext) {
							throw new Error(
								`Something bad happened: ${JSON.stringify({
									key: parameterName,
									cipherText: encryptedParameter,
									decryptCommand: decryptCommand,
								})}`,
							);
						}

						if (argv.verbose) {
							info(`Encrypting key ${emphasis(parameterName)} ${strong("ok")}`);
						}

						const value = Buffer.from(decryptionResult.Plaintext).toString();
						return [parameterName, value];
					},
				),
			),
		) as Record<string, string>;

		// create ssm client
		const ssmClient = getSSMClient({
			configuration: {
				credentials: credentialsAndOrigin.value,
				region: regionAndOrigin.value,
			},
			verbose: argv.verbose,
		});

		await Promise.all(
			Object.entries(flatParameters).map(([parameterName, value]) => {
				let type: ParameterType = ParameterType.STRING;
				const secureStrings = config.aws?.secureStrings?.pathMatches;
				if (secureStrings && Array.isArray(secureStrings)) {
					// if parameterName regex matches any of the secureStrings, set type to SecureString
					secureStrings.forEach((secureString) => {
						if (parameterName.match(secureString)) {
							type = ParameterType.SECURE_STRING;
						}
					});
				}
				const putParameterCommand = new PutParameterCommand({
					Name: `/${parameterName}`,
					Value: value,
					Type: type,
					Overwrite: true,
				});

				return ssmClient.send(putParameterCommand);
			}),
		);
	} catch (e) {
		error(e);
	}
};
