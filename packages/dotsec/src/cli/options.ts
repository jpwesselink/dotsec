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
			awsKeyAlias: [
				"--aws-key-alias <awsKeyAlias>",
				"AWS KMS key alias, overrides the value provided in dotsec.config (config.aws.kms.keyAlias)",
				"alias/dotsec",
			],
			awsRegion: [
				"--aws-region <awsRegion>",
				"AWS region, overrides the value provided in dotsec.config (config.aws.region) and AWS_REGION",
			],
		},
	},
	decrypt: {
		inheritsFrom: ["dotsec"],
		options: {
			env: ["--env <env>", "Path to .env file", DOTSEC_DEFAULT_DOTENV_FILENAME],
			sec: ["--sec <sec>", "Path to .sec file", DOTSEC_DEFAULT_DOTSEC_FILENAME],
			yes: ["--yes", "Skip confirmation prompts", false],
			awsKeyAlias: [
				"--aws-key-alias <awsKeyAlias>",
				"AWS KMS key alias, overrides the value provided in dotsec.config (config.aws.kms.keyAlias)",
				"alias/dotsec",
			],
			awsRegion: [
				"--aws-region <awsRegion>",
				"AWS region, overrides the value provided in dotsec.config (config.aws.region) and AWS_REGION",
			],
		},
	},
	encrypt: {
		inheritsFrom: ["dotsec"],
		options: {
			env: ["--env <env>", "Path to .env file", DOTSEC_DEFAULT_DOTENV_FILENAME],
			sec: ["--sec <sec>", "Path to .sec file", DOTSEC_DEFAULT_DOTSEC_FILENAME],
			yes: ["--yes", "Skip confirmation prompts", false],
			awsKeyAlias: [
				"--aws-key-alias <awsKeyAlias>",
				"AWS KMS key alias, overrides the value provided in dotsec.config (config.aws.kms.keyAlias)",
				"alias/dotsec",
			],
			awsRegion: [
				"--aws-region <awsRegion>",
				"AWS region, overrides the value provided in dotsec.config (config.aws.region) and AWS_REGION",
			],
		},
	},

	run: {
		inheritsFrom: ["dotsec"],
		options: {
			env: ["--env <env>", "Path to .env file"],
			sec: ["--sec [sec]", "Path to .sec file"],
			awsKeyAlias: [
				"--aws-key-alias <awsKeyAlias>",
				"AWS KMS key alias, overrides the value provided in dotsec.config (config.aws.kms.keyAlias)",
				"alias/dotsec",
			],
			awsRegion: [
				"--aws-region <awsRegion>",
				"AWS region, overrides the value provided in dotsec.config (config.aws.region) and AWS_REGION",
			],
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
					const r = getInheritedOptions(copts, inheritedCommandName, acc);
					return { ...r };
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
