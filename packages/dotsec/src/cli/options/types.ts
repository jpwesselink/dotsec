export type CommandOption =
	| [string, string]
	| [string, string, string | boolean | string[]];

export type ExpandedCommandOption =
	| {
			option: CommandOption;
			env?: string;
	  }
	| DeepExpandedCommandOption;

export type DeepExpandedCommandOption = {
	flags: string;
	description?: string;
	defaultValue?: string | boolean | string[];
	choices?: (string | boolean | string)[];
	fn?: (value: string, previous: unknown) => unknown;
	regexp?: RegExp;
	env?: string;
};
// export type ExpandedCommandOption =
// 	| {
// 			option: CommandOption;
// 			env?: string;
// 	  }
// 	| {
// 			flags: string;
// 			description?: string;
// 			defaultValue?: string | boolean | string[];
// 			choices?: string[];
// 			fn?: (value: string, previous: unknown) => unknown;
// 			regexp?: RegExp;
// 			env?: string;
// 	  };

export type DotSecCommandOptions = {
	[optionName: string]: CommandOption | ExpandedCommandOption;
};
export type DotSecCommandDefaults = {
	usage?: string;
	description?: string;
	helpText?: string;
	options?: DotSecCommandOptions;
	requiredOptions?: DotSecCommandOptions;
};
export type DotSecCommandsDefaults = {
	[commandName: string]: DotSecCommandDefaults;
};
