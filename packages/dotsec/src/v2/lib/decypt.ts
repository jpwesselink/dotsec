import { CreateConfig } from "../config";
import { loadDotfile, writeDotfile } from "../io";
import { awsEncryptionEngineFactory } from "../plugins/aws";
import { DecryptOptions, DotsecConfig } from "../types";
import { parse } from "dotenv";
import { expand } from "dotenv-expand";
import path from "path";

export const decrypt = async (options: {
	decryptOptions?: DecryptOptions;
	mergeConfig: CreateConfig;
}) => {
	const { mergeConfig, decryptOptions } = options;
	const commandConfigResult = mergeConfig(decryptOptions);

	const { config: commandConfig } = commandConfigResult.unwrap();
	// load the env / sec file
	const loadCiphertextResult = await loadDotfile(
		path.resolve(commandConfig.secFile),
	);

	const ciphertextContent = loadCiphertextResult.unwrap();

	let plaintextContent: string | undefined;

	const method =
		decryptOptions?.method || commandConfig.defaultEncryptionMethod;

	if (method === "aws-kms") {
		plaintextContent = await (
			await awsEncryptionEngineFactory({
				kms: {
					keyAlias: commandConfig.aws.kms.keyAlias,
					region: commandConfig.aws.kms.region || commandConfig.aws.region,
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
			path.resolve(process.cwd(), commandConfig.envFile),
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
