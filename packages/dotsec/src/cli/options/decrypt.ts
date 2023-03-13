import {
	configFileOption,
	createManifestOption,
	envFileOption,
	manifestFilePrefixOption,
	secFileOption,
	yesOption,
} from "./sharedOptions";
import { DotSecCommandsDefaults } from "./types";

const decryptCommandDefaults: DotSecCommandsDefaults = {
	decrypt: {
		options: {
			configFile: configFileOption,
			envFile: envFileOption,
			secFile: secFileOption,
			createManifest: createManifestOption,
			manifestFilePrefix: manifestFilePrefixOption,
			yes: yesOption,
		},
		description: "Decrypt a sec file",
		helpText: `Examples:


Decrypt .sec file to .env file

$ npx dotsec decrypt


Specify a different .sec file

$ npx dotsec decrypt --sec-file .sec.dev
$ SEC_FILE=.sec.dev npx dotsec decrypt

Specify a different .env file

$ npx dotsec decrypt --env-file .env.dev
$ ENV_FILE=.env.dev npx dotsec decrypt

Write a manifest markdown file

$ npx dotsec decrypt --create-manifest
$ CREATE_MANIFEST=true npx dotsec decrypt

Specify a different manifest file

$ npx dotsec decrypt --manifest-file .manifest.dev
$ MANIFEST_FILE=decryption-manifest.md npx dotsec decrypt
`,
	},
};

export default decryptCommandDefaults;
