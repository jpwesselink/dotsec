import { DotsecConfig } from "../../types/index";
import { Command, Option } from "commander";

import decryptCommandDefaults from "./decrypt";
import dotsecCommandDefaults from "./dotsec";
import encryptCommandDefaults from "./encrypt";
import initCommandDefaults from "./init";
import pushCommandDefaults from "./push";
import runCommandDefaults from "./run";
import {
	CommandOption,
	DeepExpandedCommandOption,
	DotSecCommandsDefaults,
	ExpandedCommandOption,
} from "./types";

export const commandOptions: DotSecCommandsDefaults = {
	...dotsecCommandDefaults,
	...initCommandDefaults,
	...encryptCommandDefaults,
	...decryptCommandDefaults,
	...runCommandDefaults,
	...pushCommandDefaults,
};

const expandCommandOption = (
	commandOption: CommandOption | ExpandedCommandOption,
): DeepExpandedCommandOption => {
	if (Array.isArray(commandOption)) {
		const [flags, description, defaultValue] = commandOption;
		const optionProps = {
			flags,
			description,
			defaultValue,
		};
		return optionProps;
	} else {
		if ("option" in commandOption) {
			const [flags, description, defaultValue] = commandOption.option;
			const optionProps = {
				flags,
				description,
				defaultValue,
				env: commandOption.env,
			};
			return optionProps;
		}
		return commandOption;
	}
};

const createOption = (
	commandOption: CommandOption | ExpandedCommandOption,
	options: {
		required?: boolean;
		dotsecConfig?: DotsecConfig;
		optionKey: string;
	},
): Option => {
	const defaultOptionValueFromConfig =
		options?.dotsecConfig?.defaults?.options?.[options?.optionKey];
	const optionProps = expandCommandOption(commandOption);

	const newOption = new Option(optionProps.flags, optionProps.description);
	if (optionProps.fn) {
		newOption.argParser(optionProps.fn);
	}
	if (optionProps.defaultValue) {
		newOption.default(defaultOptionValueFromConfig || optionProps.defaultValue);
	}
	if (optionProps.env) {
		newOption.env(optionProps.env);
	}
	if (options.required) {
		newOption.makeOptionMandatory(true);
	}
	if (optionProps.choices) {
		newOption.choices(optionProps.choices);
	}

	return newOption;
};

export const setProgramOptions = (params: {
	program: Command;
	commandName?: string;
	dotsecConfig: DotsecConfig;
}) => {
	const { program, commandName, dotsecConfig } = params;
	const programOptions = commandOptions[commandName || program.name()];

	if (programOptions) {
		const { options, requiredOptions, description, usage, helpText } =
			programOptions;
		if (options) {
			Object.keys(options).forEach((optionKey) => {
				const commandOption = options[optionKey];
				const newOption = createOption(commandOption, {
					dotsecConfig,
					optionKey,
				});

				program.addOption(newOption);
			});
		}
		if (requiredOptions) {
			Object.keys(requiredOptions).forEach((requiredOptionKey) => {
				const requiredOption = requiredOptions[requiredOptionKey];
				const newOption = createOption(requiredOption, {
					required: true,
					dotsecConfig,
					optionKey: requiredOptionKey,
				});

				program.addOption(newOption);
			});
		}
		if (description) {
			program.description(description);
		}
		if (usage) {
			program.usage(usage);
		}
		if (helpText) {
			program.description(helpText);
		}
	}
};
