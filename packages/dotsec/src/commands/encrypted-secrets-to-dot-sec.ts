import fs from "fs";
import path from "node:path";

import { commonCliOptions } from "../commonCliOptions";
import { getConfig } from "../lib/config-old";
import { handleCredentialsAndRegion } from "../lib/partial-commands/handleCredentialsAndRegion";
import { decryptedEncrypted } from "../lib/wtf/crypto";
import { toDotSec, toDotSecPerEnvironment } from "../lib/wtf/dotsec";
import { getDotSecEncrypted } from "../lib/wtf/io";
import { YargsHandlerParams } from "../types";
import { promptOverwriteIfFileExists } from "../utils/io";
import { getLogger, prettyCode, strong } from "../utils/logger";

export const command = "encrypted-secrets-to-dot-sec";
export const desc = `Creates .sec file from an encrypted secrets file.
If '--use-top-levels-as-environments' is set, it will create a .sec file for each top level key in the encrypted secrets file.`;

export const builder = {
	"encrypted-secrets-file": {
		string: true,
		describe: "filename of json file for writing encrypted secrets",
		default: "secrets.encrypted.json",
	},
	"sec-file": commonCliOptions.secFile,
	"search-path": commonCliOptions.searchpath,
	"aws-profile": commonCliOptions.awsProfile,
	"aws-region": commonCliOptions.awsRegion,
	"aws-key-alias": commonCliOptions.awsKeyAlias,
	"aws-assume-role-arn": commonCliOptions.awsAssumeRoleArn,
	"aws-assume-role-session-duration":
		commonCliOptions.awsAssumeRoleSessionDuration,
	"use-top-levels-as-environments": commonCliOptions.useTopLevelsAsEnvironments,
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
			options: {
				verbose: argv.verbose,
			},
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

		if (
			argv.useTopLevelsAsEnvironments ||
			dotSecEncrypted.config?.useTopLevelsAsEnvironments
		) {
			const dotSecsPerEnvironment = toDotSecPerEnvironment({
				dotSecEncrypted,
				searchPath: argv.searchPath,
				verbose: argv.verbose,
			});

			for (const [environment, dotSec] of Object.entries(
				dotSecsPerEnvironment,
			)) {
				const fileName = `.sec.${environment}`;
				const dotSecPath = path.resolve(process.cwd(), fileName);

				info(`target: ${strong(dotSecPath)}\n`);
				info(prettyCode(dotSec));
				info(`\n`);

				const overwriteResponse = await promptOverwriteIfFileExists({
					filePath: dotSecPath,
					skip: argv.yes,
				});

				if (
					overwriteResponse === undefined ||
					overwriteResponse.overwrite === true
				) {
					fs.writeFileSync(dotSecPath, dotSec);
				}

				// write to file, prompt if file exists
			}
		} else {
			const dotSec = toDotSec({
				dotSecEncrypted,
				searchPath: argv.searchPath,
				verbose: argv.verbose,
			});

			const fileName = argv.secFile || `.sec`;
			const dotSecPath = path.resolve(process.cwd(), fileName);

			info(`target: ${strong(dotSecPath)}\n`);
			info(prettyCode(dotSec));
			info(`\n`);
			const overwriteResponse = await promptOverwriteIfFileExists({
				filePath: dotSecPath,
				skip: argv.yes,
			});

			if (
				overwriteResponse === undefined ||
				overwriteResponse.overwrite === true
			) {
				fs.writeFileSync(dotSecPath, dotSec);
			}
		}
	} catch (e) {
		error(e);
	}
};
