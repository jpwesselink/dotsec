import {
	DecryptCommand,
	DescribeKeyCommand,
	EncryptCommand,
	KMSClient,
} from "@aws-sdk/client-kms";
import { EncryptionEngineFactory } from "dotsec";
import { handleCredentialsAndRegion } from "./handleCredentialsAndRegion";

export type AwsEncryptionEngineFactory = EncryptionEngineFactory<
	{ region?: string; kms?: { keyAlias?: string } },
	{ other: () => void }
>;

export const awsEncryptionEngineFactory: AwsEncryptionEngineFactory = async (
	options,
) => {
	const {
		kms: { keyAlias } = {},
		region,
	} = options;
	const { credentialsAndOrigin, regionAndOrigin } =
		await handleCredentialsAndRegion({
			argv: {},
			env: { ...process.env },
		});

	const kmsClient = new KMSClient({
		credentials: credentialsAndOrigin.value,
		region: region || regionAndOrigin.value,
	});

	const describeKeyCommand = new DescribeKeyCommand({
		KeyId: keyAlias,
	});

	const describeKeyResult = await kmsClient.send(describeKeyCommand);
	const encryptionAlgorithm =
		describeKeyResult.KeyMetadata?.EncryptionAlgorithms?.[0];

	if (encryptionAlgorithm === undefined) {
		throw new Error("Could not determine encryption algorithm");
	}

	return {
		async encrypt(plaintext: string): Promise<string> {
			const encryptCommand = new EncryptCommand({
				KeyId: keyAlias,
				Plaintext: Buffer.from(plaintext),
				EncryptionAlgorithm: encryptionAlgorithm,
			});
			const encryptionResult = await kmsClient.send(encryptCommand);

			if (!encryptionResult.CiphertextBlob) {
				throw new Error(
					`Something bad happened: ${JSON.stringify({
						encryptCommand,
					})}`,
				);
			}

			const cipherText = Buffer.from(encryptionResult.CiphertextBlob).toString(
				"base64",
			);

			return cipherText;
		},
		async decrypt(cipherText: string): Promise<string> {
			const decryptCommand = new DecryptCommand({
				KeyId: keyAlias,
				CiphertextBlob: Buffer.from(cipherText, "base64"),
				EncryptionAlgorithm: encryptionAlgorithm,
			});

			const decryptionResult = await kmsClient.send(decryptCommand);

			if (!decryptionResult.Plaintext) {
				throw new Error(
					`Something bad happened: ${JSON.stringify({
						cipherText: cipherText,
						decryptCommand: decryptCommand,
					})}`,
				);
			}

			const decryptedValue = Buffer.from(decryptionResult.Plaintext).toString();

			if (this.verbose) {
				console.info(`Decrypting key '${cipherText}'`);
			}

			return decryptedValue;
		},
		other: () => {},
	};
};
