import { CreateConfig, Decrypt, RunOptions } from "../types";
import { spawnSync } from "node:child_process";

export const configureRun =
	(options: { mergeConfig: CreateConfig; decrypt: Decrypt }) =>
	async (runOptions: RunOptions) => {
		const { decrypt } = options;
		const hahah = await decrypt(runOptions);
		// const commandConfigResult = mergeConfig(cmdOptions);

		// const { config: commandConfig } = commandConfigResult.unwrap();

		// // load the env / sec file
		// const loadDotfileResult = await loadDotfile(
		// 	path.resolve(
		// 		process.cwd(),
		// 		cmdOptions.using === "env"
		// 			? commandConfig.envFile
		// 			: commandConfig.secFile,
		// 	),
		// );

		// const dotfileContent = loadDotfileResult.unwrap();

		// let plaintextDotfile: string | undefined;

		// if (cmdOptions.using === "env") {
		// 	plaintextDotfile = dotfileContent;
		// } else if (cmdOptions?.using === "sec") {
		// 	const method =
		// 		cmdOptions.method || commandConfig.defaultEncryptionMethod;

		// 	if (method === "aws-kms") {
		// 		plaintextDotfile = await (
		// 			await awsEncryptionEngineFactory({
		// 				kms: {
		// 					keyAlias: commandConfig.aws.kms.keyAlias,
		// 					region:
		// 						commandConfig.aws.kms.region || commandConfig.aws.region,
		// 				},
		// 			})
		// 		).decrypt(dotfileContent);
		// 	}
		// }

		// if (!plaintextDotfile) {
		// 	throw new Error("Unable to decrypt the file");
		// }

		// const parseDotfileResult = parseDotfileContent(plaintextDotfile);

		const dotenv: { [key: string]: string } = hahah.parsed;
		// run the command
		const commands = runOptions.command.split(" ");
		const [userCommand, ...userCommandArgs] = commands;
		const spawn = spawnSync(userCommand, [...userCommandArgs], {
			stdio: runOptions?.stdIoOptions,
			shell: false,
			encoding: "utf-8",
			env: {
				// ...expandedEnvVars.parsed,
				...dotenv,
				...process.env,
				__DOTSEC_ENV__: JSON.stringify(Object.keys(dotenv || {})),
			},
		});

		if (spawn.status !== 0) {
			process.exit(spawn.status || 1);
		}

		return spawn;
	};
