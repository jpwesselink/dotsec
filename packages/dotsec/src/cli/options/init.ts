import { configFileOption, yesOption } from "./sharedOptions";
import { DotSecCommandsDefaults } from "./types";

const initCommandDefaults: DotSecCommandsDefaults = {
	init: {
		options: {
			configFile: configFileOption,
			yes: yesOption,
		},
		description:
			"Initialize a dotsec project by creating a dotsec.config.ts file.",
		helpText: `Examples:

Create a dotsec.config.ts file in the current directory

$ npx dotsec init


Overwrite an existing dotsec.config.ts file in the current directory

$ npx dotsec init --yes


Create a dotsec config file in the current directory with a specific config file name

By specifying the --config-file option, you can create a dotsec config file with a specific name.

$ npx dotsec init --config-file dotsec.config.ts

$ DOTSEC_CONFIG_FILE=my.config.ts npx dotsec init
`,
	},
};

export default initCommandDefaults;
