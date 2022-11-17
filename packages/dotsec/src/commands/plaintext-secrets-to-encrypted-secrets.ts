import fs from "node:fs";
import path from "node:path";

import YAML from "yaml";

import { commonCliOptions } from "../commonCliOptions";
import { getConfig } from "../lib/config-old";
import { handleCredentialsAndRegion } from "../lib/partial-commands/handleCredentialsAndRegion";
import { encryptPlainText } from "../lib/wtf/crypto";
import { getDotSecPlainText } from "../lib/wtf/io";
import { YargsHandlerParams } from "../types";
import { promptOverwriteIfFileExists } from "../utils/io";
import { getLogger, prettyCode, strong } from "../utils/logger";

export const command = "plaintext-secrets-to-encrypted-secrets";
export const desc = "Encrypts an unencrypted secretsfile";

export const builder = {
	"secrets-file": {
		string: true,
		describe: "filename of json file reading secrets",
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

		const { fileType, dotSecPlainText } = await getDotSecPlainText({
			defaultConfig: {
				config: {
					aws: {
						keyAlias: "alias/dotsec",
						regions: [regionAndOrigin.value],
					},
				},
			},
			options: {
				filename: argv.secretsFile,
			},
		});
		if (!dotSecPlainText.plaintext) {
			throw new Error(`Expected 'plaintext' property, but got none`);
		}

		const dotSecEncrypted = await encryptPlainText({
			dotSecPlainText,
			credentials: credentialsAndOrigin.value,
			region: regionAndOrigin.value,
			keyAlias: argv.awsKeyAlias,
			verbose: argv.verbose,
		});

		const encryptedSecretsPath = path.resolve(
			process.cwd(),
			path.parse(argv.encryptedSecretsFile || `secrets.encrypted.json`).name +
				"." +
				fileType,
		);
		const converted =
			fileType === "yaml" || fileType === "yml"
				? YAML.stringify(dotSecEncrypted)
				: JSON.stringify(dotSecEncrypted, null, 2);

		info(`target: ${strong(encryptedSecretsPath)}\n`);
		info(prettyCode(converted));
		info(`\n`);
		const overwriteResponse = await promptOverwriteIfFileExists({
			filePath: encryptedSecretsPath,
			skip: argv.yes,
		});
		// easy peasy, write json

		if (
			overwriteResponse === undefined ||
			overwriteResponse.overwrite === true
		) {
			fs.writeFileSync(encryptedSecretsPath, converted);
		}
	} catch (e) {
		error(e);
	}
};
