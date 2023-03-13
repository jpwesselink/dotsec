import {
	DOTSEC_DEFAULT_DOTENV_FILENAME,
	DOTSEC_DEFAULT_DOTSEC_FILENAME,
} from "../../constants";
import { ExpandedCommandOption } from "./types";

export const envFileOption: ExpandedCommandOption = {
	option: [
		"--env-file <envFile>",
		`Path to .env file. If not provided, will look for value in 'ENV_FILE' environment variable. If not provided, will look for '${DOTSEC_DEFAULT_DOTENV_FILENAME}' file in current directory.`,
		DOTSEC_DEFAULT_DOTENV_FILENAME,
	],
	env: "ENV_FILE",
};
export const secFileOption: ExpandedCommandOption = {
	option: [
		"--sec-file, <secFile>",
		`Path to .sec file. If not provided, will look for value in 'SEC_FILE' environment variable. If not provided, will look for '${DOTSEC_DEFAULT_DOTSEC_FILENAME}' file in current directory.`,
		DOTSEC_DEFAULT_DOTSEC_FILENAME,
	],
	env: "SEC_FILE",
};

export const usingOption: ExpandedCommandOption = {
	flags: "--using <using>",
	description: "Wether to use a dot env file or a dot sec file",
	choices: ["env", "sec"],
	env: "DOTSEC_USING",
};

export const usingNoEncryptionEngineOption: ExpandedCommandOption = {
	flags: "--using <using>",
	description: "Wether to use a dot env file or a dot sec file",
	choices: ["env"],
	env: "DOTSEC_USING",
};

export const yesOption: ExpandedCommandOption = {
	option: ["--yes", "Skip confirmation prompts"],
};

export const verboseOption: ExpandedCommandOption = {
	option: ["--verbose", "Verbose output"],
};

export const configFileOption: ExpandedCommandOption = {
	option: ["-c, --config-file, --configFile <configFile>", "Config file"],
	env: "DOTSEC_CONFIG_FILE",
};

export const pluginOption: ExpandedCommandOption = {
	option: ["--plugin <plugin>", "Comma-separated list of plugins to use"],
	env: "DOTSEC_PLUGIN",
};

export const engineOption: ExpandedCommandOption = {
	option: ["--engine <engine>", "Encryption engine to use"],
	env: "DOTSEC_ENGINE",
};

export const createManifestOption: ExpandedCommandOption = {
	option: [
		"--create-manifest",
		"Create a markdown manifest file. See the --manifest-file option for more information.",
	],
	env: "CREATE_MANIFEST",
};

export const manifestFilePrefixOption: ExpandedCommandOption = {
	option: [
		"--manifest-file-prefix <manifestFilePrefix>",
		"Mmanifest file prefix",
	],
	env: "ENCRYPTION_MANIFEST_FILE",
};
