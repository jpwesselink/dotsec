import fs from "node:fs";

import { Command } from "commander";
import { parse } from "dotenv";

import { DOTSEC_DEFAULT_AWS_KMS_KEY_ALIAS } from "../../constants";
import { awsEncryptionEngineFactory } from "../../lib/aws/AwsKmsEncryptionEngine";
import { RunCommandOptions } from "../../types";
import { setProgramOptions } from "../options";
import { getConfig } from "../../lib/config";
import { spawnSync } from "node:child_process";
import { CliPluginRunHandler } from "../../lib/plugin";
const addRunProgam = (
	program: Command,
	options?: {
		run?: CliPluginRunHandler[];
	},
) => {
	const subProgram = program
		.command("run2 <command...>")
		.allowUnknownOption()
		.description(
			"Run a command in a separate process and populate env with decrypted .env or encrypted .sec values",
		)
		.action(
			async (
				commands: string[],
				_options: Record<string, string>,
				command: Command,
			) => {
				const {
					configFile,
					env: dotenv,
					sec: dotsec,
					keyAlias,
					region,
				} = command.optsWithGlobals<RunCommandOptions>();

				const {
					contents: { config } = {},
				} = await getConfig(configFile);

				const encryptionPlugin = await awsEncryptionEngineFactory({
					verbose: true,
					kms: {
						keyAlias:
							keyAlias ||
							config?.aws?.kms?.keyAlias ||
							DOTSEC_DEFAULT_AWS_KMS_KEY_ALIAS,
					},
					region: region || config?.aws?.region,
				});

				let envContents: string | undefined;

				if (dotenv) {
					envContents = fs.readFileSync(dotenv, "utf8");
				} else if (dotsec) {
					const dotSecContents = fs.readFileSync(dotsec, "utf8");
					envContents = await encryptionPlugin.decrypt(dotSecContents);
				} else {
					throw new Error('Must provide either "--env" or "--sec"');
				}
				if (envContents) {
					const dotenvVars = parse(envContents);
					const [userCommand, ...userCommandArgs] = commands;
					spawnSync(userCommand, [...userCommandArgs], {
						stdio: "inherit",
						shell: false,
						env: {
							...process.env,
							...dotenvVars,
							__DOTSEC_ENV__: JSON.stringify(Object.keys(dotenvVars)),
						},
					});

					command.help();
				} else {
					throw new Error("No .env or .sec file provided");
				}
			},
		);

	setProgramOptions(subProgram, "run");
	options?.run?.map((run) => {
		const { options, requiredOptions } = run;
		if (options) {
			Object.values(options).map((option) => {
				// @ts-ignore
				subProgram.option(...option);
			});
		}
		if (requiredOptions) {
			Object.values(requiredOptions).map((requiredOption) => {
				// @ts-ignore
				subProgram.option(...requiredOption);
			});
		}
	});

	return subProgram;
};

export default addRunProgam;
