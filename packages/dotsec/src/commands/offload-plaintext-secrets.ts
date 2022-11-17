import prompts from "prompts";

import { commonCliOptions } from "../commonCliOptions";
import { getConfig } from "../lib/config-old";
import { handleCredentialsAndRegion } from "../lib/partial-commands/handleCredentialsAndRegion";
import {
	decryptedEncrypted,
	prettyPrintTasks,
	createStorePlaintextTasks,
	executeStorePlainTextTasks,
} from "../lib/wtf/crypto";
import { getDotSecEncrypted } from "../lib/wtf/io";
import { YargsHandlerParams } from "../types";
import { getLogger } from "../utils/logger";
export const command = "offload-plaintext-secrets";
export const desc =
	"Decrypts and pushes secret values to AWS SSM and SecretsManager";

export const builder = {
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
		const tasks = await createStorePlaintextTasks({
			dotSecPlainText,
			credentials: credentialsAndOrigin.value,
			region: regionAndOrigin.value,
			keyAlias: argv.awsKeyAlias,
			verbose: argv.verbose,
		});
		if (tasks.total > 0) {
			prettyPrintTasks(tasks);
			let proceed = argv.yes === true;
			if (proceed === false) {
				proceed = await prompts({
					type: "confirm",
					name: "proceed",
					message: () => {
						return `Proceed ?`;
					},
				}).then((r) => r.proceed as boolean);
			}

			if (proceed) {
				await executeStorePlainTextTasks({
					credentials: credentialsAndOrigin.value,
					region: regionAndOrigin.value,
					verbose: argv.verbose,
					tasks,
				});
			}
		} else {
			info("Nothing to do");
		}
	} catch (e) {
		error(e);
	}
};
