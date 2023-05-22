import { CreateConfig } from "../config";
import { loadDotfile, writeDotfile } from "../io";
import { awsEncryptionEngineFactory } from "../plugins/aws";
import { DecryptOptions } from "../types";
import path from "path";

export const configureEncrypt =
	(mergeConfig: CreateConfig) => async (encryptOptions?: DecryptOptions) => {
		const commandConfigResult = mergeConfig(encryptOptions);

		const { config: commandConfig } = commandConfigResult.unwrap();
		// load the env / sec file
		const loadPlaintextResult = await loadDotfile(
			path.resolve(commandConfig.defaults.envFile),
		);

		const plaintextContent = loadPlaintextResult.unwrap();

		let ciphertextContent: string | undefined;

		const method =
			encryptOptions?.method || commandConfig.defaults.defaultEncryptionMethod;

		if (method === "aws-kms") {
			ciphertextContent = await (
				await awsEncryptionEngineFactory({
					kms: {
						keyAlias: commandConfig.defaults.aws.kms.keyAlias,
						region:
							commandConfig.defaults.aws.kms.region ||
							commandConfig.defaults.aws.region,
					},
				})
			).encrypt(plaintextContent);
		}

		if (!ciphertextContent) {
			throw new Error("No ciphertext content available");
		}
		const writeOut = async () => {
			if (!ciphertextContent) {
				throw new Error("No ciphertext content available");
			}
			await writeDotfile(
				path.resolve(process.cwd(), commandConfig.defaults.secFile),
				ciphertextContent,
			);
		};
		if (encryptOptions?.write === true) {
			// write out to file
			await writeOut();
		}

		return {
			ciphertext: ciphertextContent,
			write: writeOut,
		};
	};
