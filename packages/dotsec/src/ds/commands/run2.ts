import fs from "node:fs";

import commander, { Command } from "commander";
import spawn from "cross-spawn";
import { parse } from "dotenv";

import { handleCredentialsAndRegion } from "../../lib/partial-commands/handleCredentialsAndRegion";
import {
	decryptedEncrypted,
	decryptRawDotSecValues,
} from "../../lib/wtf/crypto";
import { toDotEnv } from "../../lib/wtf/dotenv";
import { DotSec, DotSecEncrypted } from "../../lib/wtf/types";
import { DotsecConfig } from "../../lib/config/types";
export default (program: Command) => {
	const subProgram = program
		.command("run")
		.description(
			"run a command with the decrypted .sec file as environment variables: dotsec run --sec .sec command npm run start",
		)
		.summary(
			`Spawns a process with (decrypted) environment variables. 
Works with .env, .sec, secrets.{json|yml|ts} and secrets.encrypted.{json|yml|ts}.

Examples:

// run npm start with .sec file
dotsec run --sec .sec command npm start


// run npm start with .env file
dotsec run --env .env command npm start


// run npm start with secrets.json file 
dotsec run --secrets secrets.json command npm start


// run npm start with secrets.encrypted.json file
dotsec run --encrypted-secrets secrets.encrypted.json command npm start
`,
		)
		.option("--env <env>", "Run command with .env file")
		.option("--sec <sec>", "Run command with .sec file")
		.option("--secrets <secrets>", "Run command with secrets.json file")
		.option(
			"--encryptedSecrets,--encrypted-secrets <encryptedSecrets>",
			"Run command with encrypted.secrets.json file",
		)

		.option("--awsKeyAlias, --aws-key-alias <awsKeyAlias>")
		.option("--awsRegion, --aws-region <awsRegion>")
		.option("--searchPath, --search-path <searchPath>")
		.action((_options: Record<string, string>, command: Command) => {
			command.help();
		});

	subProgram
		.command("command <command...>")
		.allowUnknownOption()
		.passThroughOptions()
		.action(async (commands: string[], _options, command: Command) => {
			const config = command.parent?.getOptionValue(
				"dotsecConfig",
			) as DotsecConfig;
			const verbose = Boolean(command.parent?.getOptionValue("verbose"));
			const awsKeyAlias =
				(command.parent?.getOptionValue("awsKeyAlias") as string) ||
				config.aws.keyAlias;

			const awsRegion =
				(command.parent?.getOptionValue("awsRegion") as string) ||
				config.aws.region;
			const searchPath = command.parent?.getOptionValue("searchPath") as string;
			console.log("awsKeyAlias", awsRegion);

			const inputFiles = ["env", "sec", "secrets", "encryptedSecrets"]
				.map((fileType) => {
					const filename = command.parent?.getOptionValue(fileType) as string;
					if (filename) {
						return [fileType, filename];
					}
				})
				.filter((v) => !!v);

			let rawDotenv: string | undefined;
			if (inputFiles.length <= 1) {
				// pick that one
				try {
					const { credentialsAndOrigin, regionAndOrigin } =
						await handleCredentialsAndRegion({
							argv: {},
							env: { ...process.env },
						});

					const fileType = inputFiles.length === 0 ? "sec" : inputFiles[0]?.[0];
					const filename =
						inputFiles.length === 0 ? ".sec" : inputFiles[0]?.[1];
					console.log("filename", filename);
					if (filename && fileType) {
						const raw = fs.readFileSync(filename, "utf8");
						if (fileType === "sec") {
							rawDotenv = await decryptRawDotSecValues({
								dotSecKeysValues: parse(raw),
								credentials: credentialsAndOrigin.value,
								region: awsRegion || regionAndOrigin.value,
								keyAlias: awsKeyAlias,
								verbose,
							});
						} else if (fileType === "env") {
							rawDotenv = raw;
						} else if (fileType === "secrets") {
							const dotSecPlainText = JSON.parse(raw) as DotSec;

							rawDotenv = toDotEnv({
								dotSecPlainText,
								verbose,
								searchPath,
							});
						} else if (fileType === "encryptedSecrets") {
							rawDotenv = raw;
							const dotSecEncrypted = JSON.parse(raw) as DotSecEncrypted;
							const dotSecPlainText = await decryptedEncrypted({
								dotSecEncrypted,
								credentials: credentialsAndOrigin.value,
								region: awsRegion || regionAndOrigin.value,
								keyAlias: awsKeyAlias,
								verbose,
							});
							rawDotenv = toDotEnv({
								dotSecPlainText,
								verbose,
								searchPath,
							});
						}
					}
					if (rawDotenv) {
						const [userCommand, ...userCommandArgs] = commands;
						spawn(userCommand, [...userCommandArgs], {
							stdio: "inherit",
							shell: false,
							env: {
								...process.env,
								...parse(rawDotenv),
							},
						});
					}
				} catch (e) {
					if (e instanceof Error) {
						console.error(e.message);

						if (verbose) {
							console.error(e.name, e.stack);
						}
					}
				}
			} else {
				// error
				throw new commander.InvalidOptionArgumentError(
					"Can only pick one of --sec. --env, --secrets or --encryptedSecrets",
				);
			}
		});

	return subProgram;
};
