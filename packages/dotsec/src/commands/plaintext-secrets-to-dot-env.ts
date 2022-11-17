import fs from "fs";
import path from "node:path";

import { commonCliOptions } from "../commonCliOptions";
import { getConfig } from "../lib/config-old";
import { handleCredentialsAndRegion } from "../lib/partial-commands/handleCredentialsAndRegion";
import { toDotEnv, toDotEnvPerEnvironment } from "../lib/wtf/dotenv";
import { getDotSecPlainText } from "../lib/wtf/io";
import { YargsHandlerParams } from "../types";
import { promptOverwriteIfFileExists } from "../utils/io";
import { emphasis, getLogger, prettyCode, strong } from "../utils/logger";

export const command = "plaintext-secrets-to-dot-env";
export const desc = `Creates .env file from a secrets file.
If '--use-top-levels-as-environments' is set, it will create a .env file for each top level key in the secrets file.`;

export const builder = {
	"secrets-file": {
		string: true,
		describe: "filename of json file reading secrets",
		default: "secrets.json",
	},
	"env-file": commonCliOptions.envFile,
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
	"dry-run": commonCliOptions.dryRun,
} as const;

export const handler = async (
	argv: YargsHandlerParams<typeof builder>,
): Promise<void> => {
	const config = await getConfig();
	const { info, error } = getLogger();
	try {
		const defaultRegion = config.aws.region || argv.awsRegion;
		const { regionAndOrigin } = await handleCredentialsAndRegion({
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

		const { dotSecPlainText } = await getDotSecPlainText({
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
				verbose: argv.verbose,
			},
		});
		if (!dotSecPlainText.plaintext) {
			throw new Error(`Expected 'encrypted' property, but got none`);
		}

		if (
			argv.useTopLevelsAsEnvironments ||
			dotSecPlainText.config?.useTopLevelsAsEnvironments
		) {
			const dotEnvsPerEnvironment = toDotEnvPerEnvironment({
				dotSecPlainText,
				verbose: argv.verbose,
			});

			for (const [environment, dotEnv] of Object.entries(
				dotEnvsPerEnvironment,
			)) {
				const fileName = `.env.${environment}`;
				const dotEnvPath = path.resolve(process.cwd(), fileName);
				if (argv.dryRun) {
					// output filename, path and content
					info(strong(`// ${dotEnvPath}`));
					info(emphasis(dotEnv));
				} else {
					const overwriteResponse = await promptOverwriteIfFileExists({
						filePath: dotEnvPath,
						skip: argv.yes,
					});

					if (
						overwriteResponse === undefined ||
						overwriteResponse.overwrite === true
					) {
						fs.writeFileSync(dotEnvPath, dotEnv);
					}
				}

				// write to file, prompt if file exists
			}
		} else {
			const dotEnv = toDotEnv({
				dotSecPlainText,
				verbose: argv.verbose,
				searchPath: argv.searchPath,
			});

			const fileName = argv.envFile || `.env`;
			const dotEnvPath = path.resolve(process.cwd(), fileName);
			info(`target: ${strong(dotEnvPath)}\n`);
			info(prettyCode(dotEnv));
			info(`\n`);

			const overwriteResponse = await promptOverwriteIfFileExists({
				filePath: dotEnvPath,
				skip: argv.yes,
			});

			if (
				overwriteResponse === undefined ||
				overwriteResponse.overwrite === true
			) {
				fs.writeFileSync(dotEnvPath, dotEnv);
			}
		}
	} catch (e) {
		error(e);
	}
};
