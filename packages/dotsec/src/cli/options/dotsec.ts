import { configFileOption, pluginOption } from "./sharedOptions";
import { DotSecCommandsDefaults } from "./types";

const dotsecCommandDefaults: DotSecCommandsDefaults = {
	dotsec: {
		options: {
			configFile: configFileOption,
			plugin: pluginOption,
		},
	},
};

export default dotsecCommandDefaults;
