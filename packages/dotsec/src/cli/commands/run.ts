import fs from "node:fs";

import { addPluginOptions } from "../../lib/addPluginOptions";
import { parse } from "../../lib/parse";
import { RunCommandOptions } from "../../types";
import { BackgroundColor, backgroundColors } from "../../types/colors";
import { DotsecConfig } from "../../types/config";
import { DotsecCliPluginDecryptHandler } from "../../types/plugin";
import { strong } from "../../utils/logging";
import { setProgramOptions } from "../options";
import { camelCase } from "camel-case";
import chalk from "chalk";

import { Command } from "commander";
import { expand } from "dotenv-expand";
import { spawn } from "node:child_process";
const addRunProgam = (
	program: Command,
	options: {
		dotsecConfig: DotsecConfig;
		decryptHandlers?: DotsecCliPluginDecryptHandler[];
	},
) => {
	const { dotsecConfig, decryptHandlers } = options || {};
	// create api here

	// is there an encryption engine?
	const hasDecryptEngine =
		decryptHandlers !== undefined && decryptHandlers.length > 0;

	const subProgram = program
		.command("run <command...>")
		.allowUnknownOption(true)
		.enablePositionalOptions()
		.passThroughOptions()
		.showHelpAfterError(true)
		.action(
			async (
				commands: string[],
				_options: Record<string, string>,
				command: Command,
			) => {
				let lineBuffer: string = "";
				let addBackgroundColor: chalk.Chalk | ((str: string) => string) = (
					str: string,
				) => str;
				try {
					const {
						envFile,
						using,
						secFile,
						engine,
						outputBackgroundColor,
						showOutputPrefix,
						outputPrefix,
					} = command.optsWithGlobals<RunCommandOptions>();

					let envContents: string | undefined;

					if (using === "env" || hasDecryptEngine === false) {
						if (!envFile) {
							throw new Error("No dotenv file specified in --env-file option");
						}
						envContents = fs.readFileSync(envFile, "utf8");
					} else if (using === "sec") {
						if (!secFile) {
							throw new Error("No dotsec file specified in --sec-file option");
						}

						const encryptionEngine =
							engine || dotsecConfig?.defaults?.encryptionEngine;

						const pluginCliDecrypt = (decryptHandlers || []).find((handler) => {
							return handler.triggerOptionValue === encryptionEngine;
						});

						if (!pluginCliDecrypt) {
							throw new Error(
								`No decryption plugin found, available decryption engine(s): ${(
									decryptHandlers || []
								)
									.map((e) => `--${e.triggerOptionValue}`)
									.join(", ")}`,
							);
						}

						const allOptionKeys = [
							...Object.keys(pluginCliDecrypt.options || {}),
							...Object.keys(pluginCliDecrypt.requiredOptions || {}),
						];

						const allOptionsValues = Object.fromEntries(
							allOptionKeys.map((key) => {
								return [key, _options[key]];
							}),
						);
						try {
							const dotSecContents = fs.readFileSync(secFile, "utf8");
							envContents = await pluginCliDecrypt.handler({
								ciphertext: dotSecContents,
								...allOptionsValues,
							});
						} catch (e) {
							console.error("Something bad happened while decrypting.");
							console.error(`File: ${secFile}`);
							throw e;
						}
					}
					if (envContents) {
						const dotenvVars = parse(envContents).obj;
						// expand env vars
						const expandedEnvVars = expand({
							ignoreProcessEnv: true,
							parsed: {
								// add standard env variables
								...(process.env as Record<string, string>),
								// add custom env variables, either from .env or .sec, (or empty object if none)
								...dotenvVars,
							},
						});

						const [userCommand, ...userCommandArgs] = commands;
						const waiter: number | undefined = await new Promise((resolve) => {
							const cprocess = spawn(userCommand, [...userCommandArgs], {
								stdio: "pipe",
								shell: false,
								env: {
									...expandedEnvVars.parsed,
									...process.env,
									__DOTSEC_ENV__: JSON.stringify(Object.keys(dotenvVars)),
								},
							});

							// Forward SIGINT (Ctrl-C) to child process
							const sigintHandler = () => {
								cprocess.kill("SIGINT");
							};
							process.on("SIGINT", sigintHandler);

							// Propagate child process errors
							cprocess.on("error", (err) => {
								process.removeListener("SIGINT", sigintHandler);
								console.error("Failed to start child process:", err);
								process.exit(1);
							});

							const expandedEnvVarsWithoutEnv = expand({
								ignoreProcessEnv: true,
								parsed: {
									// add standard env variables
									// add custom env variables, either from .env or .sec, (or empty object if none)
									...dotenvVars,
								},
							});

							cprocess.stdout.setEncoding("utf8");

							let backgroundColor =
								outputBackgroundColor ||
								dotsecConfig.defaults?.options?.outputBackgroundColor;

							// if backgroundColor is a boolean
							if (
								typeof backgroundColor === "boolean" &&
								backgroundColor === true
							) {
								backgroundColor = "red-bright";
							}

							// hideOutputBackgroundColor;

							if (backgroundColor) {
								if (
									!backgroundColors.includes(backgroundColor as BackgroundColor)
								) {
									// throw error
									throw new Error(
										`Invalid background color: ${backgroundColor}`,
									);
								}
								const backgroundColorFnName = camelCase(
									`bg-${backgroundColor}`,
								);
								if (chalk[backgroundColorFnName]) {
									addBackgroundColor = chalk[
										backgroundColorFnName
									] as chalk.Chalk;
								} else {
									console.warn(
										`Invalid background color: ${backgroundColorFnName}, using default: red`,
									);
									addBackgroundColor = chalk.bgRedBright;
								}
							}

							const prefix =
								showOutputPrefix ||
								dotsecConfig?.defaults?.options?.showOutputPrefix
									? `${
											dotsecConfig?.defaults?.options?.outputPrefix ||
											outputPrefix ||
											"(dotsec) "
									  }`
									: "";

							cprocess.stdout.on("data", (data) => {
								//Here is where the output goes
								// split by new line

								lineBuffer += data.toString();

								const lines: string[] = lineBuffer.split("\n");

								for (let i = 0; i < lines.length - 1; i++) {
									const line = lines[i];

									const redactedLines = Object.entries(
										expandedEnvVarsWithoutEnv.parsed || {},
									)
										.sort(([, a], [, b]) => {
											if (a.length > b.length) {
												return -1;
											} else if (a.length < b.length) {
												return 1;
											} else {
												return 0;
											}
										})
										.reduce((acc, [key, value]) => {
											if (dotsecConfig?.redaction?.show?.includes(key)) {
												return acc;
											} else {
												const redactedValue = value.replace(/./g, "*");
												return acc.replace(value, redactedValue);
											}
										}, line);

									console.log(prefix + addBackgroundColor(redactedLines));
								}

								lineBuffer = lines[lines.length - 1];
							});

							cprocess.stdout.on("end", () => {
								console.log(prefix + addBackgroundColor(lineBuffer));
							});

							cprocess.stderr.setEncoding("utf8");
							cprocess.stderr.on("data", (data) => {
								process.stderr.write(data.toString());
							});

							cprocess.on("exit", (code: number) => {
								process.removeListener("SIGINT", sigintHandler);
								resolve(code);
							});
						});

						if (waiter !== 0) {
							console.log(addBackgroundColor(lineBuffer));
							process.exit(waiter || 1);
						}
					} else {
						throw new Error("No .env or .sec file provided");
					}
				} catch (e) {
					console.error(strong(e.message));
					command.help();
				}
			},
		);
	setProgramOptions({
		program: subProgram,
		commandName: hasDecryptEngine ? "run" : "runEnvOnly",
		dotsecConfig,
	});

	if (hasDecryptEngine) {
		decryptHandlers?.map((run) => {
			const { options, requiredOptions } = run;
			addPluginOptions(options, subProgram);
			addPluginOptions(requiredOptions, subProgram, true);
		});
		const engines = decryptHandlers?.map((e) => e.triggerOptionValue);

		subProgram.option(
			"--engine <engine>",
			`Encryption engine${engines.length > 0 ? "s" : ""}: ${engines.join(
				", ",
			)}${engines.length === 1 ? engines[0] : undefined}`,
		);
	}
	return subProgram;
};

export default addRunProgam;
