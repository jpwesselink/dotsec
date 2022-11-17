import fs from "node:fs";
import path from "node:path";

import { KMSClient, DecryptCommand } from "@aws-sdk/client-kms";
import { redBright } from "chalk";
import { constantCase } from "constant-case";
import { spawn } from "cross-spawn";
import { parse } from "dotenv";
import flat from "flat";

import { commonCliOptions } from "../commonCliOptions";
import { getConfig } from "../lib/config-old";
import { loadEncryptedSecrets } from "../lib/encryptedSecrets";
import { handleCredentialsAndRegion } from "../lib/partial-commands/handleCredentialsAndRegion";
import {
	CredentialsAndOrigin,
	RegionAndOrigin,
	YargsHandlerParams,
} from "../types";
import { fileExists } from "../utils/io";
import { getEncryptionAlgorithm } from "../utils/kms";

export const command = "$0 <command>";
export const desc =
	"Decrypts a .sec file, injects the results into a separate process and runs a command";

export const builder = {
	"aws-profile": commonCliOptions.awsProfile,
	"aws-region": commonCliOptions.awsRegion,
	"aws-key-alias": commonCliOptions.awsKeyAlias,
	"sec-file": commonCliOptions.secFile,
	"env-file": commonCliOptions.envFile,
	"ignore-missing-env-file": commonCliOptions.ignoreMissingEnvFile,
	"aws-assume-role-arn": commonCliOptions.awsAssumeRoleArn,
	"aws-assume-role-session-duration":
		commonCliOptions.awsAssumeRoleSessionDuration,
	"encrypted-secrets-file": commonCliOptions.encryptedSecretsFile,
	"json-filter": commonCliOptions.jsonFilter,

	verbose: commonCliOptions.verbose,
	// yes: { ...commonCliOptions.yes },
	command: { string: true, required: true },
} as const;

const handleSec = async ({
	secFile,
	credentialsAndOrigin,
	regionAndOrigin,
	awsKeyAlias,
}: {
	secFile: string;
	credentialsAndOrigin: CredentialsAndOrigin;
	regionAndOrigin: RegionAndOrigin;
	awsKeyAlias: string;
}) => {
	const secSource = path.resolve(process.cwd(), secFile);
	if (!(await fileExists(secSource))) {
		console.error(`Could not open ${redBright(secSource)}`);
		return;
	}
	const parsedSec = parse(fs.readFileSync(secSource, { encoding: "utf8" }));

	const kmsClient = new KMSClient({
		credentials: credentialsAndOrigin.value,
		region: regionAndOrigin.value,
	});

	const encryptionAlgorithm = await getEncryptionAlgorithm(
		kmsClient,
		awsKeyAlias,
	);

	const envEntries: [string, string][] = await Promise.all(
		Object.entries(parsedSec).map(async ([key, cipherText]) => {
			const decryptCommand = new DecryptCommand({
				KeyId: awsKeyAlias,
				CiphertextBlob: Buffer.from(cipherText, "base64"),
				EncryptionAlgorithm: encryptionAlgorithm,
			});
			const decryptionResult = await kmsClient.send(decryptCommand);

			if (!decryptionResult?.Plaintext) {
				throw new Error(
					`No: ${JSON.stringify({
						key,
						cipherText,
						decryptCommand,
					})}`,
				);
			}
			const value = Buffer.from(decryptionResult.Plaintext).toString();
			return [key, value];
		}),
	);
	const env = Object.fromEntries(envEntries);

	return env;
};
const handleEncryptedJson = async ({
	encryptedSecretsFile,
	jsonFilter,
	credentialsAndOrigin,
	regionAndOrigin,
	awsKeyAlias,
}: {
	encryptedSecretsFile: string;
	jsonFilter?: string;
	credentialsAndOrigin: CredentialsAndOrigin;
	regionAndOrigin: RegionAndOrigin;
	awsKeyAlias: string;
}) => {
	const encryptedSecrets = await loadEncryptedSecrets({
		encryptedSecretsFile: encryptedSecretsFile,
	});

	const flattened: Record<string, string> = flat.flatten(
		encryptedSecrets.encryptedParameters,
		{
			delimiter: "__",
			transformKey: (key) => {
				return constantCase(key);
			},
		},
	);

	const kmsClient = new KMSClient({
		credentials: credentialsAndOrigin.value,
		region: regionAndOrigin.value,
	});

	const encryptionAlgorithm = await getEncryptionAlgorithm(
		kmsClient,
		awsKeyAlias,
	);

	const filterKey = jsonFilter
		?.split(".")
		.map((part) => constantCase(part))
		.join("__");
	const envEntries: [string, string][] = await Promise.all(
		Object.entries(flattened)
			.filter(([key]) => {
				if (filterKey) {
					return key.indexOf(filterKey) === 0;
				}
				return true;
			})
			.map(async ([key, cipherText]) => {
				const decryptCommand = new DecryptCommand({
					KeyId: awsKeyAlias,
					CiphertextBlob: Buffer.from(cipherText, "base64"),
					EncryptionAlgorithm: encryptionAlgorithm,
				});
				const decryptionResult = await kmsClient.send(decryptCommand);

				if (!decryptionResult?.Plaintext) {
					throw new Error(
						`No: ${JSON.stringify({
							key,
							cipherText,
							decryptCommand,
						})}`,
					);
				}
				const value = Buffer.from(decryptionResult.Plaintext).toString();
				return [key, value];
			}),
	);
	const env = Object.fromEntries(envEntries);

	return env;
};
export const handler = async (
	argv: YargsHandlerParams<typeof builder>,
): Promise<void> => {
	const config = await getConfig();

	try {
		let env: Record<string, string> | undefined;
		let awsEnv: Record<string, string> | undefined;

		try {
			if (argv.envFile) {
				env = parse(fs.readFileSync(argv.envFile, { encoding: "utf8" }));

				if (
					argv.awsAssumeRoleArn ||
					process.env.AWS_ASSUME_ROLE_ARN ||
					env?.AWS_ASSUME_ROLE_ARN
				) {
					const { credentialsAndOrigin, regionAndOrigin } =
						await handleCredentialsAndRegion({
							argv: {
								...argv,
								awsRegion: config.aws.region || argv.awsRegion,
								awsProfile: config.aws.profile || argv.awsProfile,
								awsAssumeRoleArn:
									config.aws.assumeRoleArn || argv.awsAssumeRoleArn,
								awsAssumeRoleSessionDuration:
									config.aws.assumeRoleSessionDuration ||
									argv.awsAssumeRoleSessionDuration,
							},
							env: { ...process.env },
						});

					awsEnv = {
						AWS_ACCESS_KEY_ID: credentialsAndOrigin.value.accessKeyId,
						AWS_SECRET_ACCESS_KEY: credentialsAndOrigin.value.secretAccessKey,
					};

					if (credentialsAndOrigin.value.sessionToken) {
						awsEnv.AWS_SESSION_TOKEN = credentialsAndOrigin.value.sessionToken;
					}
					// this means we have
				}
			} else {
				const { credentialsAndOrigin, regionAndOrigin } =
					await handleCredentialsAndRegion({
						argv: {
							...argv,
							awsRegion: config.aws.region || argv.awsRegion,
							awsProfile: config.aws.profile || argv.awsProfile,
							awsAssumeRoleArn:
								config.aws.assumeRoleArn || argv.awsAssumeRoleArn,
							awsAssumeRoleSessionDuration:
								config.aws.assumeRoleSessionDuration ||
								argv.awsAssumeRoleSessionDuration,
						},
						env: { ...process.env },
					});

				if (
					(argv.awsAssumeRoleArn ||
						process.env.AWS_ASSUME_ROLE_ARN ||
						env?.AWS_ASSUME_ROLE_ARN) &&
					credentialsAndOrigin.value.sessionToken !== undefined
				) {
					awsEnv = {
						AWS_ACCESS_KEY_ID: credentialsAndOrigin.value.accessKeyId,
						AWS_SECRET_ACCESS_KEY: credentialsAndOrigin.value.secretAccessKey,
						AWS_SESSION_TOKEN: credentialsAndOrigin.value.sessionToken,
					};
					// this means we have
				}
				if (argv.verbose) {
					console.log({ credentialsAndOrigin, regionAndOrigin });
				}
				const awsKeyAlias = argv.awsKeyAlias || config.aws.keyAlias;

				if (argv.encryptedSecretsFile) {
					env = await handleEncryptedJson({
						encryptedSecretsFile: argv.encryptedSecretsFile,
						jsonFilter: argv.jsonFilter,
						credentialsAndOrigin,
						regionAndOrigin,
						awsKeyAlias,
					});
					// // load that file
					// const encryptedSecrets = await loadEncryptedSecrets({
					//     encryptedSecretsFile: argv.encryptedSecretsFile,
					// });

					// const flattened = flat.flatten(encryptedSecrets, {
					//     delimiter: '__',
					//     transformKey: (key) => {
					//         return constantCase(key);
					//     },
					// });

					// console.log('flattened', flattened);

					// const unflattend = flat.unflatten(flattened, {
					//     delimiter: '__',
					//     transformKey: (key) => {
					//         return camelCase(key);
					//     },
					// });

					// console.log(JSON.stringify(unflattend, null, 4));
				} else {
					env = await handleSec({
						secFile: argv.secFile,
						credentialsAndOrigin,
						regionAndOrigin,
						awsKeyAlias,
					});
				}
			}
		} catch (e) {
			if (argv.ignoreMissingEnvFile !== true) {
				throw e;
			}
		}

		//
		const userCommandArgs = process.argv.slice(
			process.argv.indexOf(argv.command) + 1,
		);

		if (argv.command) {
			spawn(argv.command, [...userCommandArgs], {
				stdio: "inherit",
				shell: false,
				env: { ...process.env, ...awsEnv, ...env },
			});
		}
	} catch (e) {
		console.error(e);
	}
};
