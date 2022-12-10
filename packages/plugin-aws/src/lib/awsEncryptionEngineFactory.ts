import { keySpecAlgorithmPayloadMaxByteSizes } from "../constants";
import { handleCredentialsAndRegion } from "../utils/handleCredentialsAndRegion";
import {
	DecryptCommand,
	DescribeKeyCommand,
	EncryptCommand,
	KMSClient,
} from "@aws-sdk/client-kms";
import { DotsecEncryptionEngineFactory } from "dotsec";

export type AwsEncryptionEngineFactory = DotsecEncryptionEngineFactory<
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
	const keySpec = describeKeyResult.KeyMetadata?.KeySpec;
	if (!keySpec) {
		throw new Error("Could not determine key spec");
	}
	const encryptionAlgorithm =
		describeKeyResult.KeyMetadata?.EncryptionAlgorithms?.[0];

	if (encryptionAlgorithm === undefined) {
		throw new Error("Could not determine encryption algorithm");
	}

	const maxPayloadSize =
		keySpecAlgorithmPayloadMaxByteSizes[keySpec]?.[encryptionAlgorithm];

	if (maxPayloadSize === undefined) {
		throw new Error(
			`Could not determine max payload size for key spec ${keySpec} and encryption algorithm ${encryptionAlgorithm}`,
		);
	}
	// Encryption payloads vary depending on the encryption algorithm, see https://docs.aws.amazon.com/kms/latest/APIReference/API_Encrypt.html

	return {
		async encrypt(plaintext: string): Promise<string> {
			// split plaintext in chunks of 4096 bytes
			// https://docs.aws.amazon.com/kms/latest/developerguide/limits.html#limits-api

			const plaintextUint8Array = new TextEncoder().encode(plaintext);
			const chunkSize = maxPayloadSize;
			const cipherTextParts: string[] = [];
			for (let i = 0; i < plaintextUint8Array.length; i += chunkSize) {
				const chunk = plaintextUint8Array.slice(i, i + chunkSize);

				const encryptCommand = new EncryptCommand({
					KeyId: keyAlias,
					Plaintext: chunk,
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

				const cipherText = Buffer.from(
					encryptionResult.CiphertextBlob,
				).toString("base64");

				cipherTextParts.push(cipherText);
			}

			return cipherTextParts.join("\n");
		},

		async decrypt(cipherTextsWithNewlines: string): Promise<string> {
			const cipherTexts = cipherTextsWithNewlines.split("\n");

			const plaintext = (
				await Promise.all(
					cipherTexts.map(async (cipherText) => {
						const decryptCommand = new DecryptCommand({
							KeyId: keyAlias,
							CiphertextBlob: Buffer.from(cipherText, "base64"),
							EncryptionAlgorithm: encryptionAlgorithm,
						});

						const decryptionResult = await kmsClient.send(decryptCommand);

						if (!decryptionResult.Plaintext) {
							throw new Error(
								`Something bad happened: ${JSON.stringify({
									cipherText: cipherTextsWithNewlines,
									decryptCommand: decryptCommand,
								})}`,
							);
						}
						const decryptedValue = Buffer.from(
							decryptionResult.Plaintext,
						).toString();
						return decryptedValue;
					}),
				)
			).join("");

			if (this.verbose) {
				console.info(`Decrypting key '${cipherTextsWithNewlines}'`);
			}

			return plaintext;
		},
		other: () => {},
	};
};
