import { DotsecCliOption } from "../types/plugin";
import { Command, Option } from "commander";

export const addPluginOptions = (
	options:
		| {
				[x: string]: DotsecCliOption;
		  }
		| undefined,
	command: Command,
	mandatory?: boolean,
) => {
	if (options) {
		Object.values(options).map((option) => {
			let optionProps:
				| {
						flags: string;
						description?: string;
						defaultValue?: string | boolean | string[];
						choices?: string[];
						fn?: (value: string, previous: unknown) => unknown;
						regexp?: RegExp;
						env?: string;
				  }
				| undefined;
			if (Array.isArray(option)) {
				const [flags, description, defaultValue] = option;
				optionProps = {
					flags,
					description,
					defaultValue,
				};
			} else {
				const { flags, description, defaultValue, choices, env, fn } = option;
				optionProps = {
					flags,
					description,
					defaultValue,
					choices,
					env,
					fn,
				};
			}

			if (optionProps) {
				const newOption = new Option(
					optionProps.flags,
					optionProps.description,
				);
				if (optionProps.fn) {
					newOption.argParser(optionProps.fn);
				}
				if (optionProps.defaultValue) {
					newOption.default(optionProps.defaultValue);
				}
				if (optionProps.env) {
					newOption.env(optionProps.env);
				}
				if (mandatory) {
					newOption.makeOptionMandatory(true);
				}
				if (optionProps.choices) {
					newOption.choices(optionProps.choices);
				}
				command.addOption(newOption);
			}
		});
	}
};
