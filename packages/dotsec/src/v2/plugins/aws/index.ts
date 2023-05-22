import { ParseResult, ParseResults, parseRaw } from "./parseRaw";
import { handleCredentialsAndRegion } from "./utils/handleCredentialsAndRegion";
import {
	DecryptCommand,
	DescribeKeyCommand,
	EncryptCommand,
	KMSClient,
} from "@aws-sdk/client-kms";
import {
	EncryptionAlgorithmSpec,
	KeySpec,
} from "@aws-sdk/client-kms/dist-types/models";
import crypto from "node:crypto";
export const keySpecAlgorithmPayloadMaxByteSizes: {
	[key in KeySpec]?: {
		[key in EncryptionAlgorithmSpec]?: number;
	};
} = {
	SYMMETRIC_DEFAULT: {
		SYMMETRIC_DEFAULT: 4096,
	},
	RSA_2048: {
		RSAES_OAEP_SHA_1: 214,
		RSAES_OAEP_SHA_256: 190,
	},
	RSA_3072: {
		RSAES_OAEP_SHA_1: 342,
		RSAES_OAEP_SHA_256: 318,
	},

	RSA_4096: {
		RSAES_OAEP_SHA_1: 470,
		RSAES_OAEP_SHA_256: 446,
	},
	SM2: {
		SM2PKE: 1024,
	},
} as const;

export const defaultRegion = "us-east-1";

type DotsecEncryptionEngineFactoryProps = {
	verbose?: boolean;
};

type DotsecEncryptionEngine<T = Record<string, unknown>> = {
	encrypt(plaintext: string, ciphertext?: string): Promise<string>;
	decrypt(ciphertext: string): Promise<string>;
} & T;

type DotsecEncryptionEngineFactory<
	T = Record<string, unknown>,
	V extends Record<string, unknown> = Record<string, unknown>,
> = {
	(options: DotsecEncryptionEngineFactoryProps & T): Promise<
		DotsecEncryptionEngine<V>
	>;
};

export type AwsEncryptionEngineFactory = DotsecEncryptionEngineFactory<
	{ kms?: { region?: string; keyAlias?: string } },
	{ other: () => void }
>;

export const awsEncryptionEngineFactory: AwsEncryptionEngineFactory = async (
	options,
) => {
	const {
		kms: { region, keyAlias } = {},
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
		async encrypt(
			plaintext: string,
			previousCiphertext?: string,
		): Promise<string> {
			const rawEnvObject = parseRaw(plaintext);
			let previousRawSecObject: ParseResults | undefined;
			if (previousCiphertext) {
				previousRawSecObject = parseRaw(previousCiphertext);
			}

			let cipherText = plaintext;

			// iterate over envObject values
			for (const [key, result] of Object.entries(rawEnvObject)) {
				// convert to uint8array

				// create md5 hash of value
				const valueHash = await crypto.subtle.digest(
					"SHA-256",
					new TextEncoder().encode(result.value),
				);

				// do we have a previous value?
				let previousValueHashBase64: string | undefined;
				let previousValue: ParseResult | undefined;
				if (previousRawSecObject) {
					previousValue = previousRawSecObject[key];
					try {
						if (previousValue) {
							const { hash } = JSON.parse(
								previousValue.value
									.substring(1, previousValue.value.length - 1)
									.replace(/\\"/g, '"'),
							) as { hash: string; parts: string[] };

							previousValueHashBase64 = hash;
						}
					} catch (e) {
						console.error(e);
					}
				}

				// convert to base64
				const valueHashBase64 = Buffer.from(valueHash).toString("base64");
				if (!previousValue || previousValueHashBase64 !== valueHashBase64) {
					// remove double colons
					const valueHashBase64NoDoubleColons = valueHashBase64.replace(
						/:::/g,
						"",
					);

					const plaintextUint8Array = new TextEncoder().encode(result.value);
					const cipherTextParts: string[] = [];
					for (let i = 0; i < plaintextUint8Array.length; i += maxPayloadSize) {
						const chunk = plaintextUint8Array.slice(i, i + maxPayloadSize);

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
									encryptionResult,
								})}`,
							);
						}
						cipherTextParts.push(
							Buffer.from(encryptionResult.CiphertextBlob).toString("base64"),
						);
					}
					const serializedCipherTextParts = JSON.stringify({
						hash: valueHashBase64NoDoubleColons,
						parts: cipherTextParts,
					}).replace(/"/g, '\\"');
					cipherText = cipherText.replace(
						`${result.key}=${result.value}`,
						`${key}="${serializedCipherTextParts}"`,
					);
				} else if (previousValue) {
					cipherText = cipherText.replace(
						`${result.key}=${result.value}`,
						`${previousValue.key}=${previousValue.value}`,
					);
				}
			}

			return cipherText;
		},

		async decrypt(cipherTextsWithNewlines: string): Promise<string> {
			const rawSecObject = parseRaw(cipherTextsWithNewlines);
			let plaintext = cipherTextsWithNewlines;
			for (const value of Object.values(rawSecObject)) {
				// get value
				const { parts: cipherTexts } = JSON.parse(
					value.value.substring(1, value.value.length - 1).replace(/\\"/g, '"'),
				) as { hash: string; parts: string[] };

				const plaintextParts: string[] = [];
				for (const cipherText of cipherTexts) {
					const decryptCommand = new DecryptCommand({
						KeyId: keyAlias,
						CiphertextBlob: Buffer.from(cipherText, "base64"),
						EncryptionAlgorithm: encryptionAlgorithm,
					});
					try {
						const decryptionResult = await kmsClient.send(decryptCommand);
						if (!decryptionResult.Plaintext) {
							throw new Error(
								`Something bad happened: ${JSON.stringify({
									cipherText: cipherTextsWithNewlines,
									decryptCommand: decryptCommand,
								})}`,
							);
						}
						plaintextParts.push(
							Buffer.from(decryptionResult.Plaintext).toString("utf8"),
						);
					} catch (error) {
						console.error(error);
					}
					const unserializedPlaintextParts = plaintextParts.join("");
					plaintext = plaintext.replace(
						`${value.key}=${value.value}`,
						`${value.key}=${unserializedPlaintextParts}`,
					);
				}
			}

			if (this.verbose) {
				console.info(`Decrypting key '${cipherTextsWithNewlines}'`);
			}

			return plaintext;
		},
		other: () => {},
	};
};
