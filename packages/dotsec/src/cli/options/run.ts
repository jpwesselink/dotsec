import {
	configFileOption,
	engineOption,
	envFileOption,
	outputBackgroundColorOption,
	outputPrefixOption,
	secFileOption,
	showOutputPrefixOption,
	showRedactedOption,
	usingNoEncryptionEngineOption,
	usingOption,
	yesOption,
} from "./sharedOptions";
import { DotSecCommandsDefaults } from "./types";
/*

run --env-file=.env --sec-file=.sec --with=env-file

*/
const runCommandDefaults: DotSecCommandsDefaults = {
	runEnvOnly: {
		usage: "--using env [commandArgs...]",

		options: {
			configFile: configFileOption,
			envFile: envFileOption,
			yes: yesOption,
			engine: engineOption,
			showRedacted: showRedactedOption,
			outputBackgroundColor: outputBackgroundColorOption,
			showOutputPrefix: showOutputPrefixOption,
			outputPrefix: outputPrefixOption,
		},
		requiredOptions: {
			using: usingNoEncryptionEngineOption,
		},

		description:
			"Run a command in a separate process and populate env with contents of a dotenv file.",
		helpText: `Examples:
		
Run a command with a .env file
		
$ npx dotsec run --using env node -e \"console.log(process.env)\"


Run a command with a specific .env file

$ npx dotsec run --using env --env-file .env node -e \"console.log(process.env)\"


Run a command with a specific ENV_FILE variable

$ ENV_FILE=.env.dev npx dotsec run --using env node -e \"console.log(process.env)\"


You can also specify 'using' as an environment variable

$ DOTSEC_USING=env npx dotsec run node -e \"console.log(process.env)\"
		`,
	},
	run: {
		options: {
			configFile: configFileOption,
			envFile: envFileOption,
			secFile: secFileOption,
			yes: yesOption,
			showRedacted: showRedactedOption,
			outputBackgroundColor: outputBackgroundColorOption,
			hideOutputPrefix: showOutputPrefixOption,
			outputPrefix: outputPrefixOption,
		},
		requiredOptions: {
			using: usingOption,
		},

		usage: "[--using env] [--using sec] [commandArgs...]",
		description: `Run a command in a separate process and populate env with either 
			- contents of a dotenv file
			- decrypted values of a dotsec file.

The --withEnv option will take precedence over the --withSec option. If neither are specified, the --withEnv option will be used by default.`,
		helpText: `${"Examples:"}

${"Run a command with a .env file"}

$ dotsec run echo "hello world"


${"Run a command with a specific .env file"}

$ dotsec run --with-env --env-file .env.dev echo "hello world"


${"Run a command with a .sec file"}

$ dotsec run --with-sec echo "hello world"


${"Run a command with a specific .sec file"}

$ dotsec run --with-sec --sec-file .sec.dev echo "hello world"
`,
	},
	// push: {
	// 	options: {
	// 		...dotsecCommandDefaults.dotsec.options,
	// 		withEnv: withEnvOption,
	// 		withSec: withSecOption,
	// 		envFile: envFileOption,
	// 		secFile: secFileOption,
	// 		yes: yesOption,
	// 	},
	// 	requiredOptions: {
	// 		...dotsecCommandDefaults.dotsec.requiredOptions,
	// 	},
	// },
};

export default runCommandDefaults;
