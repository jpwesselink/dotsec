import { loadDotfile, writeDotfile } from "../io";
import { awsEncryptionEngineFactory } from "../plugins/aws";
import { ConfigureDecrypt } from "../types";
import { parse } from "dotenv";
import { expand } from "dotenv-expand";
import path from "path";

export const configureDecrypt: ConfigureDecrypt =
	(mergeConfig) => async (decryptOptions) => {
		const commandConfigResult = mergeConfig(decryptOptions);

		const { config: commandConfig } = commandConfigResult.unwrap();
		// load the env / sec file
		const loadCiphertextResult = await loadDotfile(
			path.resolve(commandConfig.defaults.secFile),
		);

		const ciphertextContent = loadCiphertextResult.unwrap();

		let plaintextContent: string | undefined;

		const method =
			decryptOptions?.method || commandConfig.defaults.defaultEncryptionMethod;

		if (method === "aws-kms") {
			plaintextContent = await (
				await awsEncryptionEngineFactory({
					kms: {
						keyAlias: commandConfig.defaults.aws.kms.keyAlias,
						region:
							commandConfig.defaults.aws.kms.region ||
							commandConfig.defaults.aws.region,
					},
				})
			).decrypt(ciphertextContent);
		}

		if (!plaintextContent) {
			throw new Error("No plaintext content available");
		}
		const writeOut = async () => {
			if (!plaintextContent) {
				throw new Error("No plaintext content available");
			}

			await writeDotfile(
				path.resolve(process.cwd(), commandConfig.defaults.envFile),
				plaintextContent,
			);
		};
		if (decryptOptions?.write === true) {
			// write out to file
			await writeOut();
		}

		const parsed = parse(plaintextContent);
		const expanded = expand({
			ignoreProcessEnv: true,
			parsed: { ...parsed },
		});

		if (!expanded.parsed) {
			throw new Error("No parsed content available");
		}
		return {
			write: writeOut,
			parsed,
			expanded: expanded.parsed,
			plaintext: plaintextContent,
			config: commandConfig,
		};
	};
