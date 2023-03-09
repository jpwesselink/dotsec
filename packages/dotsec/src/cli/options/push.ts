import {
	configFileOption,
	envFileOption,
	secFileOption,
	usingOption,
	yesOption,
} from "./sharedOptions";
import { DotSecCommandsDefaults } from "./types";

const pushCommandDefaults: DotSecCommandsDefaults = {
	push: {
		options: {
			configFile: configFileOption,
			envFile: envFileOption,
			secFile: secFileOption,
			yes: yesOption,
		},
		requiredOptions: {
			using: usingOption,
		},
		description: "Push variables from env or sec file to a remote",
		helpText: `Examples:

Push variables from .env file to remote

$ npx dotsec push --using env
$ DOTSEC_USING=env npx dotsec push


Push variables from .sec file to remote

$ npx dotsec push --using sec
$ DOTSEC_USING=sec npx dotsec push
`,
	},
};

export default pushCommandDefaults;
