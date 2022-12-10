import { Command } from "commander";

import {
	DOTSEC_DEFAULT_CONFIG_FILE,
	DOTSEC_DEFAULT_DOTENV_FILENAME,
	DOTSEC_DEFAULT_DOTSEC_FILENAME,
} from "../constants";

type Options = {
	[optionName: string]:
		| [string, string]
		| [string, string, string | boolean | string[]];
};

type CommandOptions = {
	[commandName: string]: {
		inheritsFrom?: string[];
		options?: Options;
		requiredOptions?: Options;
	};
};
export const commandOptions: CommandOptions = {
	dotsec: {
		options: {
			verbose: ["--verbose", "Verbose output", false],
			configFile: [
				"-c, --config-file, --configFile <configFile>",
				"Config file",
				DOTSEC_DEFAULT_CONFIG_FILE,
			],
			plugin: [
				"-p, --plugin <plugin>",
				"Comma-separated list of plugins to use",
			],
		},
	},
	init: {
		options: {
			verbose: ["--verbose", "Verbose output", false],
			configFile: [
				"-c, --config-file, --configFile <configFile>",
				"Config file",
				DOTSEC_DEFAULT_CONFIG_FILE,
			],

			env: ["--env", "Path to .env file", DOTSEC_DEFAULT_DOTENV_FILENAME],
			sec: ["--sec", "Path to .sec file", DOTSEC_DEFAULT_DOTSEC_FILENAME],
			yes: ["--yes", "Skip confirmation prompts", false],
			// awsKeyAlias: [
			// 	"--aws-key-alias <awsKeyAlias>",
			// 	"AWS KMS key alias, overrides the value provided in dotsec.config (config.aws.kms.keyAlias)",
			// 	"alias/dotsec",
			// ],
			// awsRegion: [
			// 	"--aws-region <awsRegion>",
			// 	"AWS region, overrides the value provided in dotsec.config (config.aws.region) and AWS_REGION",
			// ],
		},
	},

	encrypt: {
		inheritsFrom: ["dotsec"],
		options: {
			env: ["--env <env>", "Path to .env file", DOTSEC_DEFAULT_DOTENV_FILENAME],
			sec: ["--sec <sec>", "Path to .sec file", DOTSEC_DEFAULT_DOTSEC_FILENAME],
			yes: ["--yes", "Skip confirmation prompts", false],
		},
	},
	decrypt: {
		inheritsFrom: ["dotsec"],
		options: {
			env: ["--env <env>", "Path to .env file", DOTSEC_DEFAULT_DOTENV_FILENAME],
			sec: ["--sec <sec>", "Path to .sec file", DOTSEC_DEFAULT_DOTSEC_FILENAME],
			yes: ["--yes", "Skip confirmation prompts", false],
		},
	},

	run: {
		inheritsFrom: ["dotsec"],

		options: {
			withEnv: [
				"--with-env, --withEnv",
				`Run command with ${DOTSEC_DEFAULT_DOTENV_FILENAME} file`,
			],
			withSec: [
				"--with-sec, --withSec",
				`Run command with ${DOTSEC_DEFAULT_DOTSEC_FILENAME} file`,
			],
			env: ["--env <env>", "Path to .env file", DOTSEC_DEFAULT_DOTENV_FILENAME],
			sec: ["--sec <sec>", "Path to .sec file", DOTSEC_DEFAULT_DOTSEC_FILENAME],
			yes: ["--yes", "Skip confirmation prompts", false],
		},
	},
	push: {
		inheritsFrom: ["dotsec"],
		options: {
			withEnv: [
				"--with-env, --withEnv",
				`Run command with ${DOTSEC_DEFAULT_DOTENV_FILENAME} file`,
			],
			withSec: [
				"--with-sec, --withSec",
				`Run command with ${DOTSEC_DEFAULT_DOTSEC_FILENAME} file`,
			],

			env: ["--env <env>", "Path to .env file", DOTSEC_DEFAULT_DOTENV_FILENAME],
			sec: ["--sec <sec>", "Path to .sec file", DOTSEC_DEFAULT_DOTSEC_FILENAME],
			yes: ["--yes", "Skip confirmation prompts", false],
		},
	},
};

const getInheritedOptions = (
	copts: CommandOptions,
	commandName: string,
	result: { options?: Options; requiredOptions?: Options } = {},
): { options?: Options; requiredOptions?: Options } | undefined => {
	const command = copts[commandName];
	if (command) {
		if (command.inheritsFrom) {
			return command?.inheritsFrom.reduce(
				(acc, inheritedCommandName) => {
					return getInheritedOptions(copts, inheritedCommandName, acc);
				},
				{
					options: { ...result.options, ...command.options },
					requiredOptions: {
						...result.requiredOptions,
						...command.requiredOptions,
					},
				},
			);
		} else {
			return {
				options: { ...result.options, ...command.options },
				requiredOptions: {
					...result.requiredOptions,
					...command.requiredOptions,
				},
			};
		}
	}
};

export const setProgramOptions = (program: Command, commandName?: string) => {
	const programOptions = getInheritedOptions(
		commandOptions,
		commandName || program.name(),
	);

	if (programOptions?.options) {
		Object.values(programOptions.options).forEach(
			([option, description, defaultValue]) => {
				program.option(option, description, defaultValue);
			},
		);
	}
	if (programOptions?.requiredOptions) {
		Object.values(programOptions.requiredOptions).forEach(
			([option, description, defaultValue]) => {
				program.requiredOption(option, description, defaultValue);
			},
		);
	}
};
