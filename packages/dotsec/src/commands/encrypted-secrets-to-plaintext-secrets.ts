import fs from "node:fs";
import path from "node:path";

import YAML from "yaml";

import { commonCliOptions } from "../commonCliOptions";
import { getConfig } from "../lib/config-old";
import { handleCredentialsAndRegion } from "../lib/partial-commands/handleCredentialsAndRegion";
import { decryptedEncrypted } from "../lib/wtf/crypto";
import { getDotSecEncrypted } from "../lib/wtf/io";
import { YargsHandlerParams } from "../types";
import { promptOverwriteIfFileExists } from "../utils/io";
import { getLogger, prettyCode, strong } from "../utils/logger";
export const command = "encrypted-secrets-to-plaintext-secrets";
export const desc =
	"Decrypts an encrypted file and stores the result in a plaintext file";

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
		const defaultRegion = config.aws.region || argv.awsRegion;
		const { credentialsAndOrigin, regionAndOrigin } =
			await handleCredentialsAndRegion({
				argv: {
					...argv,
					awsRegion: defaultRegion,
					awsProfile: config.aws.profile || argv.awsProfile,
					awsAssumeRoleArn: config.aws.assumeRoleArn || argv.awsAssumeRoleArn,
					awsAssumeRoleSessionDuration:
						config.aws.assumeRoleSessionDuration ||
						argv.awsAssumeRoleSessionDuration,
				},
				env: { ...process.env },
			});

		const { fileType, dotSecEncrypted } = await getDotSecEncrypted({
			defaultConfig: {
				config: {
					aws: {
						keyAlias: "alias/dotsec",
						regions: [regionAndOrigin.value],
					},
				},
			},
			options: {},
		});
		if (!dotSecEncrypted.encrypted) {
			throw new Error(`Expected 'encrypted' property, but got none`);
		}
		// const dotSecEncryptedFlattened = flattenEncrypted(dotSecEncrypted);
		// const expanded = expandEncrypted(dotSecEncryptedFlattened);

		const dotSecPlainText = await decryptedEncrypted({
			dotSecEncrypted,
			credentials: credentialsAndOrigin.value,
			region: regionAndOrigin.value,
			keyAlias: argv.awsKeyAlias,
			verbose: argv.verbose,
		});

		if (argv.secretsFile) {
			// let's inspect this one first
			const secretsFileExtension = path.extname(argv.secretsFile).substring(1);
		}

		const secretsPath = path.resolve(
			process.cwd(),
			path.parse(argv.secretsFile || `secrets.json`).name + "." + fileType,
		);

		console.log(
			"secretsPath",
			fileType,
			path.parse(argv.secretsFile || `secrets.json`).name,
		);
		const converted =
			fileType === "yaml" || fileType === "yml"
				? YAML.stringify(dotSecPlainText)
				: JSON.stringify(dotSecPlainText, null, 2);

		info(`target: ${strong(secretsPath)}\n`);
		info(prettyCode(converted));
		info(`\n`);

		const overwriteResponse = await promptOverwriteIfFileExists({
			filePath: secretsPath,
			skip: argv.yes,
		});

		if (
			overwriteResponse === undefined ||
			overwriteResponse.overwrite === true
		) {
			fs.writeFileSync(secretsPath, converted);
		}
	} catch (e) {
		error(e);
	}
};
