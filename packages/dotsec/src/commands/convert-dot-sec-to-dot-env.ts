import fs from "node:fs";
import path from "node:path";

import * as dotenv from "dotenv";
import { CommandModule } from "yargs";

import { commonCliOptions } from "../commonCliOptions";
import { getConfig } from "../lib/config-old";
import { handleCredentialsAndRegion } from "../lib/partial-commands/handleCredentialsAndRegion";
import { decryptRawDotSecValues } from "../lib/wtf/crypto";
import { loadFile } from "../lib/wtf/io";
import { YargsHandlerParams } from "../types";
import { promptOverwriteIfFileExists } from "../utils/io";
import { getLogger } from "../utils/logger";
export const command = "dot-sec-to-dot-env";
export const desc = `Creates .env file from a .sec file.`;
const convertDotSecToDotEnv: CommandModule<{
	"sec-file": { string: true };
}> = {
	builder: {
		"sec-file": commonCliOptions.secFile,
		"env-file": commonCliOptions.envFile,
		"aws-profile": commonCliOptions.awsProfile,
		"aws-region": commonCliOptions.awsRegion,
		"aws-key-alias": commonCliOptions.awsKeyAlias,
		"aws-assume-role-arn": commonCliOptions.awsAssumeRoleArn,
		"aws-assume-role-session-duration":
			commonCliOptions.awsAssumeRoleSessionDuration,
		"use-top-levels-as-environments":
			commonCliOptions.useTopLevelsAsEnvironments,
		verbose: commonCliOptions.verbose,
		yes: { ...commonCliOptions.yes },
	},
	handler: async (argv: YargsHandlerParams<typeof builder>): Promise<void> => {
		const config = await getConfig();

		const { error } = getLogger();
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

			// load .env file
			const dotSecFilename = argv.secFile || ".sec";
			const dotSecPath = path.resolve(process.cwd(), dotSecFilename);
			const dotSecString = await loadFile(dotSecPath);
			const dotSecKeysValues = dotenv.parse(dotSecString);
			const dotEnvString = await decryptRawDotSecValues({
				dotSecKeysValues,
				credentials: credentialsAndOrigin.value,
				region: regionAndOrigin.value,
				keyAlias: argv.awsKeyAlias || "alias/dotsec",
				verbose: argv.verbose,
			});

			const dotEnvFilename = argv.envFile || `.env`;
			const dotEnvPath = path.resolve(process.cwd(), dotEnvFilename);

			const overwriteResponse = await promptOverwriteIfFileExists({
				filePath: dotEnvPath,
				skip: argv.yes,
			});

			if (
				overwriteResponse === undefined ||
				overwriteResponse.overwrite === true
			) {
				fs.writeFileSync(dotEnvPath, dotEnvString);
			}

			// const { fileType, dotSecPlainText } = await getDotSecPlainText({
			//     defaultConfig: {
			//         config: {
			//             aws: {
			//                 keyAlias: 'alias/dotsec',
			//                 regions: [regionAndOrigin.value],
			//             },
			//         },
			//     },
			//     options: {
			//         verbose: argv.verbose,
			//     },
			// });
			// if (!dotSecPlainText.plaintext) {
			//     throw new Error(`Expected 'encrypted' property, but got none`);
			// }

			// if (
			//     argv.useTopLevelsAsEnvironments ||
			//     dotSecPlainText.config?.useTopLevelsAsEnvironments
			// ) {
			//     const dotEnvsPerEnvironment = toDotEnvPerEnvironment({
			//         dotSecPlainText,
			//         verbose: argv.verbose,
			//     });

			//     for (const [environment, dotEnv] of Object.entries(
			//         dotEnvsPerEnvironment,
			//     )) {
			//         const fileName = `.env.${environment}`;
			//         const dotEnvPath = path.resolve(process.cwd(), fileName);

			//         const overwriteResponse = await promptOverwriteIfFileExists({
			//             filePath: dotEnvPath,
			//             skip: argv.yes,
			//         });

			//         if (
			//             overwriteResponse === undefined ||
			//             overwriteResponse.overwrite === true
			//         ) {
			//             fs.writeFileSync(dotEnvPath, dotEnv);
			//         }

			//         // write to file, prompt if file exists
			//     }
			// } else {
			//     const dotEnv = toDotEnv({
			//         dotSecPlainText,
			//         verbose: argv.verbose,
			//     });

			//     const fileName = `.env`;
			//     const dotEnvPath = path.resolve(process.cwd(), fileName);

			//     const overwriteResponse = await promptOverwriteIfFileExists({
			//         filePath: dotEnvPath,
			//         skip: argv.yes,
			//     });

			//     if (
			//         overwriteResponse === undefined ||
			//         overwriteResponse.overwrite === true
			//     ) {
			//         fs.writeFileSync(dotEnvPath, dotEnv);
			//     }
			// }
		} catch (e) {
			error(e);
		}
	},
};
export const builder = {
	"sec-file": commonCliOptions.secFile,
	"env-file": commonCliOptions.envFile,
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

export default convertDotSecToDotEnv;

export const handler = async (
	argv: YargsHandlerParams<typeof builder>,
): Promise<void> => {
	const config = await getConfig();

	const { error } = getLogger();
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

		// load .env file
		const dotSecFilename = argv.secFile || ".sec";
		const dotSecPath = path.resolve(process.cwd(), dotSecFilename);
		const dotSecString = await loadFile(dotSecPath);
		const dotSecKeysValues = dotenv.parse(dotSecString);
		const dotEnvString = await decryptRawDotSecValues({
			dotSecKeysValues,
			credentials: credentialsAndOrigin.value,
			region: regionAndOrigin.value,
			keyAlias: argv.awsKeyAlias || "alias/dotsec",
			verbose: argv.verbose,
		});

		const dotEnvFilename = argv.envFile || `.env`;
		const dotEnvPath = path.resolve(process.cwd(), dotEnvFilename);

		const overwriteResponse = await promptOverwriteIfFileExists({
			filePath: dotEnvPath,
			skip: argv.yes,
		});

		if (
			overwriteResponse === undefined ||
			overwriteResponse.overwrite === true
		) {
			fs.writeFileSync(dotEnvPath, dotEnvString);
		}

		// const { fileType, dotSecPlainText } = await getDotSecPlainText({
		//     defaultConfig: {
		//         config: {
		//             aws: {
		//                 keyAlias: 'alias/dotsec',
		//                 regions: [regionAndOrigin.value],
		//             },
		//         },
		//     },
		//     options: {
		//         verbose: argv.verbose,
		//     },
		// });
		// if (!dotSecPlainText.plaintext) {
		//     throw new Error(`Expected 'encrypted' property, but got none`);
		// }

		// if (
		//     argv.useTopLevelsAsEnvironments ||
		//     dotSecPlainText.config?.useTopLevelsAsEnvironments
		// ) {
		//     const dotEnvsPerEnvironment = toDotEnvPerEnvironment({
		//         dotSecPlainText,
		//         verbose: argv.verbose,
		//     });

		//     for (const [environment, dotEnv] of Object.entries(
		//         dotEnvsPerEnvironment,
		//     )) {
		//         const fileName = `.env.${environment}`;
		//         const dotEnvPath = path.resolve(process.cwd(), fileName);

		//         const overwriteResponse = await promptOverwriteIfFileExists({
		//             filePath: dotEnvPath,
		//             skip: argv.yes,
		//         });

		//         if (
		//             overwriteResponse === undefined ||
		//             overwriteResponse.overwrite === true
		//         ) {
		//             fs.writeFileSync(dotEnvPath, dotEnv);
		//         }

		//         // write to file, prompt if file exists
		//     }
		// } else {
		//     const dotEnv = toDotEnv({
		//         dotSecPlainText,
		//         verbose: argv.verbose,
		//     });

		//     const fileName = `.env`;
		//     const dotEnvPath = path.resolve(process.cwd(), fileName);

		//     const overwriteResponse = await promptOverwriteIfFileExists({
		//         filePath: dotEnvPath,
		//         skip: argv.yes,
		//     });

		//     if (
		//         overwriteResponse === undefined ||
		//         overwriteResponse.overwrite === true
		//     ) {
		//         fs.writeFileSync(dotEnvPath, dotEnv);
		//     }
		// }
	} catch (e) {
		error(e);
	}
};
