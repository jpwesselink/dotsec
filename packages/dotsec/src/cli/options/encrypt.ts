import {
	configFileOption,
	createManifestOption,
	envFileOption,
	manifestFilePrefixOption,
	secFileOption,
	yesOption,
} from "./sharedOptions";
import { DotSecCommandsDefaults } from "./types";

const encryptCommandDefaults: DotSecCommandsDefaults = {
	encrypt: {
		options: {
			configFile: configFileOption,
			envFile: envFileOption,
			secFile: secFileOption,
			createManifest: createManifestOption,
			manifestFile: manifestFilePrefixOption,
			yes: yesOption,
		},
		description: "Encrypt an env file",
		helpText: `Examples:


Encrypt .env file to .sec file

$ npx dotsec encrypt


Specify a different .env file

$ npx dotsec encrypt --env-file .env.dev
$ ENV_FILE=.env.dev npx dotsec encrypt


Specify a different .sec file

$ npx dotsec encrypt --sec-file .sec.dev
$ SEC_FILE=.sec.dev npx dotsec encrypt


Write a manifest markdown file

$ npx dotsec encrypt --create-manifest
$ CREATE_MANIFEST=true npx dotsec encrypt


Specify a different manifest file

$ npx dotsec encrypt --manifest-file manifest.dev
$ MANIFEST_FILE=encryption-manifest.md npx dotsec encrypt
`,
	},
};

export default encryptCommandDefaults;
