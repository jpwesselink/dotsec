import {
	DecryptCommand,
	DescribeKeyCommand,
	EncryptCommand,
} from "@aws-sdk/client-kms";
import {
	CreateSecretCommand,
	ListSecretsCommand,
	PutSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import {
	ParameterTier,
	ParameterType,
	PutParameterCommand,
} from "@aws-sdk/client-ssm";
import { Credentials } from "@aws-sdk/types";
import { constantCase } from "constant-case";

import { getEncryptionAlgorithm, getKMSClient } from "../../utils/kms";
import { emphasis, getLogger, strong } from "../../utils/logger";
import { getSecretsManagerClient } from "../../utils/secretsManager";
import { getSSMClient } from "../../utils/ssm";
import {
	expandEncrypted,
	expandPlainText,
	flattenEncrypted,
	flattenPlainText,
} from "./flat";
import {
	DotSecEncrypted,
	DotSecEncryptedFlattened,
	DotSecPlainText,
	DotSecPlainTextFlattened,
	DotSecValue,
	isBoolean,
	isNumber,
	isRegularParameter,
	isRegularParameterObject,
	isSecretsManagerParameter,
	isSSMParameter,
	isString,
} from "./types";

const maybeJson = (value: string): string | JSON => {
	try {
		return JSON.parse(value) as JSON;
	} catch (e) {
		return value;
	}
};
export const decryptedEncrypted = async (options: {
	dotSecEncrypted: DotSecEncrypted;
	credentials: Credentials;
	region: string;
	verbose?: boolean;
	keyAlias?: string;
}): Promise<DotSecPlainText> => {
	const { dotSecEncrypted, credentials, region, verbose, keyAlias } = options;
	const dotSecEncryptedFlattened = flattenEncrypted(dotSecEncrypted);
	// get logger
	const { info, table } = getLogger();
	// create KMS client
	const kmsClient = getKMSClient({
		configuration: {
			credentials,
			region,
		},
		verbose,
	});

	const awsKeyAlias = keyAlias || dotSecEncrypted.config?.aws?.keyAlias;
	if (!awsKeyAlias) {
		throw new Error("No key alias specified");
	}
	if (verbose) {
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

	const dotSecFlattened: DotSecPlainTextFlattened = {
		config: { ...dotSecEncrypted.config },
		plaintext: {},
	};
	for (const [key, encryptedValue] of Object.entries(
		dotSecEncryptedFlattened.encrypted,
	)) {
		const decryptCommand = new DecryptCommand({
			KeyId: awsKeyAlias,
			CiphertextBlob: Buffer.from(encryptedValue.encryptedValue, "base64"),
			EncryptionAlgorithm: encryptionAlgorithm,
		});

		const decryptionResult = await kmsClient.send(decryptCommand);

		if (!decryptionResult.Plaintext) {
			throw new Error(
				`Something bad happened: ${JSON.stringify({
					key,
					cipherText: encryptedValue,
					decryptCommand: decryptCommand,
				})}`,
			);
		}

		if (verbose) {
			info(`Decrypting key ${emphasis(key)} ${strong("ok")}`);
		}

		const decryptedValue = Buffer.from(decryptionResult.Plaintext).toString();
		const decryptedKeyValue = JSON.parse(decryptedValue) as {
			key: string;
			value: string;
		};
		/**
		 * We don't really know for sure if this is JSON or not, so we'll try to parse it
		 * Since we do not accept JSON at top level, we have a nice foot gun here.
		 */
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		dotSecFlattened.plaintext[key] = maybeJson(decryptedKeyValue.value);
	}
	return expandPlainText(dotSecFlattened);
};

export const encryptPlainText = async (options: {
	dotSecPlainText: DotSecPlainText;
	credentials: Credentials;
	region: string;
	verbose?: boolean;
	keyAlias?: string;
}): Promise<DotSecEncrypted> => {
	const { dotSecPlainText, credentials, region, verbose, keyAlias } = options;
	const dotSecFlattened = flattenPlainText(dotSecPlainText);
	const { info } = getLogger();
	// create KMS client
	const kmsClient = getKMSClient({
		configuration: {
			credentials,
			region,
		},
		verbose,
	});

	const awsKeyAlias = keyAlias || dotSecFlattened.config?.aws?.keyAlias;
	if (!awsKeyAlias) {
		throw new Error("No key alias specified");
	}
	if (verbose) {
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

	const encryptedDotSecFlattened: DotSecEncryptedFlattened = {
		config: { ...dotSecFlattened.config },
		encrypted: {},
	};
	for (const [key, plainTextValue] of Object.entries(
		dotSecFlattened.plaintext,
	)) {
		let plainTextValueCopy = plainTextValue;
		// check if parameter is string, number or boolean, if not, encode to json
		if (
			typeof plainTextValueCopy !== "string" &&
			typeof plainTextValueCopy !== "number" &&
			typeof plainTextValueCopy !== "boolean"
		) {
			plainTextValueCopy = JSON.stringify(plainTextValue);
		}

		const damn = JSON.stringify({ key, value: plainTextValueCopy });
		const encryptCommand = new EncryptCommand({
			KeyId: awsKeyAlias,
			Plaintext: Buffer.from(String(damn)),
			EncryptionAlgorithm: encryptionAlgorithm,
		});

		const encryptionResult = await kmsClient.send(encryptCommand);

		if (!encryptionResult.CiphertextBlob) {
			throw new Error(
				`Something bad happened: ${JSON.stringify({
					key,
					value: plainTextValue,
					encryptCommand,
				})}`,
			);
		}

		if (verbose) {
			info(`Encrypting key ${emphasis(key)} ${strong("ok")}`);
		}

		const cipherText = Buffer.from(encryptionResult.CiphertextBlob).toString(
			"base64",
		);

		if (isRegularParameter(plainTextValue)) {
			encryptedDotSecFlattened.encrypted[key] = {
				type: "standard",
				encryptedValue: cipherText,
			};
			// do something ssm
		} else if (isSSMParameter(plainTextValue)) {
			encryptedDotSecFlattened.encrypted[key] = {
				type: "ssm",
				encryptedValue: cipherText,
			};
			// do something ssm
		} else if (isSecretsManagerParameter(plainTextValue)) {
			encryptedDotSecFlattened.encrypted[key] = {
				type: "secretsManager",
				encryptedValue: cipherText,
			};
		}
	}
	return expandEncrypted(encryptedDotSecFlattened);
};

type SyncTasks = {
	total: number;
	putParameterCommands: PutParameterCommand[];
	createSecretCommands: CreateSecretCommand[];
	putSecretValueCommands: PutSecretValueCommand[];
};
export const createStorePlaintextTasks = async (options: {
	dotSecPlainText: DotSecPlainText;
	credentials: Credentials;
	region: string;
	verbose?: boolean;
	keyAlias?: string;
}): Promise<SyncTasks> => {
	const { dotSecPlainText, credentials, region, verbose, keyAlias } = options;
	const dotSecPlainTextFlattened = flattenPlainText(dotSecPlainText);
	// get logger
	const { info } = getLogger();
	// create KMS client
	// create ssm client
	const ssmClient = getSSMClient({
		configuration: {
			credentials,
			region,
		},
		verbose,
	});

	const secretsManagerClient = getSecretsManagerClient({
		configuration: {
			credentials,
			region,
		},
		verbose,
	});

	// Array<[secretName: string, arn: string]>
	const secretNameArnTuples = (
		await secretsManagerClient.send(new ListSecretsCommand({}))
	)?.SecretList?.map((secret) => [secret.Name, secret.ARN]).filter(
		([name, ARN]) => name && ARN,
	) as [string, string][];

	// { [secretName: string] : arn }
	const existingSecrets = secretNameArnTuples
		? Object.fromEntries(secretNameArnTuples)
		: {};

	const awsKeyAlias = keyAlias || dotSecPlainText.config?.aws?.keyAlias;
	if (!awsKeyAlias) {
		throw new Error(`No key alias specified`);
	}
	if (verbose) {
		info(`Encrypting to SSM and/or SecretsManager in ${emphasis(region)}`);
	}

	const putParameterCommands: PutParameterCommand[] = [];
	const createSecretCommands: CreateSecretCommand[] = [];
	const putSecretValueCommands: PutSecretValueCommand[] = [];

	for (const [keyPath, plainTextValue] of Object.entries(
		dotSecPlainTextFlattened.plaintext,
	)) {
		let storageValue: DotSecValue;
		if (isRegularParameter(plainTextValue)) {
			if (isRegularParameterObject(plainTextValue)) {
				storageValue = plainTextValue.value;
			} else {
				storageValue = plainTextValue;
			}
		} else if (isSSMParameter(plainTextValue)) {
			// if (isSSMParameterObject(plainTextValue)) {
			storageValue = plainTextValue.value;
			// } else {
			//     storageValue = plainTextValue;
			// }
		} else if (isSecretsManagerParameter(plainTextValue)) {
			storageValue = plainTextValue.value;
		} else {
			throw new Error("Invalid parameter type");
		}
		// check if parameter is string, number or boolean, if not, encode to json
		if (
			!isString(storageValue) &&
			!isNumber(storageValue) &&
			!isBoolean(storageValue)
		) {
			storageValue = JSON.stringify(storageValue);
		}
		if (
			isSSMParameter(plainTextValue) ||
			(isRegularParameter(plainTextValue) &&
				dotSecPlainText.config?.standardParameterStorageType === "ssm" &&
				(isRegularParameterObject(plainTextValue)
					? plainTextValue.dontStore !== true
					: true))
		) {
			let parameterTier: ParameterTier = ParameterTier.STANDARD;
			let parameterType: ParameterType = ParameterType.STRING;
			let description: string | undefined;
			if (isSSMParameter(plainTextValue)) {
				if (plainTextValue?.ssm?.tier) {
					parameterTier = plainTextValue.ssm.tier;
				}
				if (plainTextValue?.ssm?.type) {
					parameterType = plainTextValue.ssm.type;
				}
				if (plainTextValue?.description) {
					description = plainTextValue.description;
				}
			}
			const putParameterCommand = new PutParameterCommand({
				Name: `/${keyPath}`,
				Value: String(storageValue),
				Type: parameterType,
				Tier: parameterTier,
				Description: description,
				Overwrite: true,
			});
			putParameterCommands.push(putParameterCommand);
			// await ssmClient.send(putParameterCommand);
		} else if (
			isSecretsManagerParameter(plainTextValue) ||
			(isRegularParameter(plainTextValue) &&
				dotSecPlainText.config?.standardParameterStorageType ===
					"secretsManager" &&
				(isRegularParameterObject(plainTextValue)
					? plainTextValue.dontStore !== true
					: true))
		) {
			const existingSecretARN = existingSecrets[keyPath];
			if (!existingSecretARN) {
				const createSecretCommand = new CreateSecretCommand({
					Name: keyPath,
					SecretString: String(storageValue),
				});
				createSecretCommands.push(createSecretCommand);
				// await secretsManagerClient.send(createSecretCommand);
			} else {
				const putSecretCommand = new PutSecretValueCommand({
					SecretId: existingSecretARN,
					SecretString: String(storageValue),
				});
				putSecretValueCommands.push(putSecretCommand);
				// await secretsManagerClient.send(putSecretCommand);
			}
		}
	}

	return {
		total:
			putParameterCommands.length +
			createSecretCommands.length +
			putSecretValueCommands.length,
		putParameterCommands,
		createSecretCommands,
		putSecretValueCommands,
	};
};

export const executeStorePlainTextTasks = async (options: {
	credentials: Credentials;
	region: string;
	verbose?: boolean;
	tasks: SyncTasks;
}): Promise<void> => {
	const { credentials, region, verbose, tasks } = options;
	const { info } = getLogger();
	const ssmClient = getSSMClient({
		configuration: {
			credentials,
			region,
		},
		verbose,
	});

	const secretsManagerClient = getSecretsManagerClient({
		configuration: {
			credentials,
			region,
		},
		verbose,
	});
	for (const putParameterCommand of tasks.putParameterCommands) {
		process.stdout.write(
			`Storing SSM parameter ${emphasis(
				putParameterCommand.input.Name || "<unnamed> ",
			)}... `,
		);
		await ssmClient.send(putParameterCommand);
		process.stdout.write(`done\n`);
	}
	for (const createSecretCommand of tasks.createSecretCommands) {
		process.stdout.write(
			`Creating Secret ${emphasis(
				createSecretCommand.input.Name || "<unnamed> ",
			)}... `,
		);
		await secretsManagerClient.send(createSecretCommand);
		process.stdout.write(`done\n`);
	}
	for (const putSecretValueCommand of tasks.putSecretValueCommands) {
		process.stdout.write(
			`Updating Secret ${emphasis(
				putSecretValueCommand.input.SecretId || "<unknown id> ",
			)}... `,
		);
		await secretsManagerClient.send(putSecretValueCommand);
		process.stdout.write(`done\n`);
	}
};

export const prettyPrintTasks = (tasks: SyncTasks) => {
	const { info, table } = getLogger();
	const { putParameterCommands, createSecretCommands, putSecretValueCommands } =
		tasks;

	const ssmTasks = putParameterCommands.map((command) => {
		return {
			name: command.input.Name,
			description: command.input.Description || "<no description>",
			tier: command.input.Tier,
			type: command.input.Type,
			value: command.input.Value,
		};
	});
	info(emphasis(`AWS Systems Manager > Parameter Store: create or update`));
	table(ssmTasks);

	const createSecretTasks = createSecretCommands.map((command) => {
		return {
			secretName: command.input.Name,
			description: command.input.Description || "<no description>",
			value: "**** redacted ****>",
		};
	});
	if (createSecretTasks.length) {
		info(emphasis(`AWS Secrets Manager Secrets: create`));
		table(createSecretTasks);
	}
	const updateSecretTasks = putSecretValueCommands.map((command) => {
		return {
			secretName: command.input.SecretId,
			value: "**** redacted ****>",
		};
	});
	if (updateSecretTasks.length) {
		info(emphasis(`AWS Secrets Manager Secrets: update`));
		table(updateSecretTasks);
	}
};
export const decryptRawDotSecValues = async (options: {
	dotSecKeysValues: Record<string, string>;
	credentials: Credentials;
	region: string;
	verbose?: boolean;
	keyAlias?: string;
	searchPath?: string;
}): Promise<string> => {
	const { info } = getLogger();

	const {
		dotSecKeysValues: rawDotSec,
		credentials,
		region,
		verbose,
		keyAlias,
		searchPath,
	} = options;

	const kmsClient = getKMSClient({
		configuration: {
			credentials,
			region,
		},
		verbose,
	});

	const s = searchPath
		?.split(".")
		.map((part) => `${constantCase(part)}_`)
		.join("");
	const awsKeyAlias = keyAlias;
	if (!keyAlias) {
		throw new Error("No key alias specified");
	}

	const encryptionAlgorithm = await getEncryptionAlgorithm(kmsClient, keyAlias);
	const dotEnvLines: string[] = [];

	const filtered = s
		? Object.fromEntries(
				Object.entries(rawDotSec)
					.filter(([key]) => key.startsWith(s))
					.map(([key, value]) => [key.replace(s, ""), value]),
		  )
		: rawDotSec;
	for (const [key, encryptedValue] of Object.entries(filtered)) {
		const decryptCommand = new DecryptCommand({
			KeyId: awsKeyAlias,
			CiphertextBlob: Buffer.from(encryptedValue, "base64"),
			EncryptionAlgorithm: encryptionAlgorithm,
		});

		const decryptionResult = await kmsClient.send(decryptCommand);

		if (!decryptionResult.Plaintext) {
			throw new Error(
				`Something bad happened: ${JSON.stringify({
					key,
					cipherText: encryptedValue,
					decryptCommand: decryptCommand,
				})}`,
			);
		}

		if (verbose) {
			info(`Decrypting key ${emphasis(key)} ${strong("ok")}`);
		}

		const decryptedValue = Buffer.from(decryptionResult.Plaintext).toString();
		// this *is* json
		const parsedValue = JSON.parse(decryptedValue) as {
			key: string;
			value: string;
		};

		const stringOrJson = maybeJson(parsedValue.value);

		if (isRegularParameter(stringOrJson)) {
			if (isRegularParameterObject(stringOrJson)) {
				dotEnvLines.push(`${key}=${JSON.stringify(stringOrJson.value)}`);
			} else {
				dotEnvLines.push(`${key}=${String(stringOrJson)}`);
			}
		} else if (isSSMParameter(stringOrJson)) {
			// if (isSSMParameterObject(stringOrJson)) {
			dotEnvLines.push(`${key}=${JSON.stringify(stringOrJson.value)}`);
			// } else {
			//     dotEnvLines.push(`${key}=${String(stringOrJson)}`);
			// }
		} else if (isSecretsManagerParameter(stringOrJson)) {
			dotEnvLines.push(`${key}=${JSON.stringify(stringOrJson.value)}`);
		}

		// unbox values
	}

	return dotEnvLines.join("\n");
};
