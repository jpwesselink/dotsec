import { Command } from "commander";
import { parse } from "dotenv";
import { handleCredentialsAndRegion } from "../../lib/partial-commands/handleCredentialsAndRegion";
import {
	decryptedEncrypted,
	decryptRawDotSecValues,
} from "../../lib/wtf/crypto";
import fs from "node:fs";
import { toDotEnv } from "../../lib/wtf/dotenv";
import spawn from "cross-spawn";
import { DotSec, DotSecEncrypted } from "../../lib/wtf/types";
import { getConfig } from "../../lib/config";
type Formats = {
	env?: string;
	sec?: string;
	secrets?: string;
	encryptedSecrets?: string;
};
export default (program: Command) => {
	const subProgram = program
		.enablePositionalOptions()
		.command("convert")
		.option("--env <env>", "Run command with .env file")
		.option("--sec <sec>", "Run command with .sec file")
		.option("--secrets <secrets>", "Run command with secrets.json file")
		.option(
			"--encryptedSecrets,--encrypted-secrets <encryptedSecrets>",
			"Run command with secrets.encrypted.json file",
		)
		.option("--verbose")
		.option("--awsKeyAlias, --aws-key-alias <awsKeyAlias>")
		.option("--searchPath, --search-path <searchPath>")
		.usage("convert --env .env to --sec .sec")
		.summary("awesome convert")
		.description(
			"Converts between .env, .sec, secrets.json, and secrets.encrypted.json.",
		)
		.action((_options: Formats, command: Command) => {
			command.help();
		});

	subProgram
		.command("to")
		.option("--env <env>", "Run command with .env file")
		.option("--sec <sec>", "Run command with .sec file")
		.option("--secrets <secrets>", "Run command with secrets.json file")
		.option(
			"--encryptedSecrets,--encrypted-secrets <encryptedSecrets>",
			"Run command with secrets.encrypted.json file",
		)
		.action(async (_options: Formats, command: Command) => {
			const configfile = command.parent?.getOptionValue("config") as string;
			const config = await getConfig(configfile);
			const verbose = Boolean(command.parent?.getOptionValue("verbose"));
			const awsKeyAlias =
				(command.parent?.getOptionValue("awsKeyAlias") as string) ||
				config.aws.keyAlias;
			const awsRegion =
				(command.parent?.getOptionValue("awsRegion") as string) ||
				config.aws.region;

			const searchPath = command.parent?.getOptionValue("searchPath") as string;

			console.log({ verbose, awsKeyAlias, searchPath });
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
				} catch (e) {
					if (e instanceof Error) {
						console.error(e.message);

						if (verbose) {
							console.error(e.name, e.stack);
						}
					}
				}
			} else {
				console.log(inputFiles);
				// error

				throw new commander.InvalidOptionArgumentError(
					"Can only pick one of --sec. --env, --secrets or --encryptedSecrets",
				);
			}
			console.log("rawDotenv", rawDotenv);
		});

	return subProgram;
};
