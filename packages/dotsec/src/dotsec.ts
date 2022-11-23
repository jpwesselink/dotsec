import { parse } from "dotenv";
import { DOTSEC_DEFAULT_AWS_KMS_KEY_ALIAS } from "./constants";
import { awsEncryptionEngineFactory } from "./lib/aws/AwsKmsEncryptionEngine";
import { getConfig } from "./lib/config";
import fs from "node:fs";
import { strong } from "./utils/logger";
import { DotsecConfig } from "./types";

const config = async (
	options: {
		aws?: { region?: string; kms?: { keyAlias?: string } };
	} & (
		| { sec: true | string; env?: never }
		| { env: true | string; sec?: never }
	) &
		(
			| { dotsecConfig: DotsecConfig; configFile?: never }
			| { dotsecConfig?: never; configFile: string }
			| { dotsecConfig?: never; configFile?: never }
		),
) => {
	const { configFile, sec, env, dotsecConfig } = options;
	const {
		contents: { config } = { config: {} },
	} = dotsecConfig ? { contents: dotsecConfig } : await getConfig(configFile);
	const keyAlias =
		options.aws?.kms?.keyAlias ||
		config?.aws?.kms?.keyAlias ||
		DOTSEC_DEFAULT_AWS_KMS_KEY_ALIAS;

	const region = options.aws?.region || config?.aws?.region;
	const encryptionPlugin = await awsEncryptionEngineFactory({
		verbose: true,
		kms: {
			keyAlias: keyAlias,
		},
		region: region,
	});

	let dotsec: string | undefined;
	let dotenv: string | undefined;
	// is set?
	if (sec) {
		// is string ?
		if (typeof sec === "string") {
			// here we hava filename
			dotsec = sec;
		} else if (typeof options.sec === "boolean" && options.sec === true) {
			// is true ?
			dotsec = ".sec";
		}
	} else if (env) {
		// is string ?
		if (typeof env === "string") {
			// here we hava filename
			dotenv = env;
		} else if (typeof options.env === "boolean" && options.env === true) {
			// is true ?
			dotenv = ".env";
		}
	} else {
		// if not set, we use default
		dotsec = ".sec";
		console.warn(
			`Since no value is set for neither ${strong("sec")} nor ${strong(
				"env",
			)}, we use default value for sec which is .sec`,
		);
	}

	let envContents: string | undefined;

	if (dotenv) {
		envContents = fs.readFileSync(dotenv, "utf8");
	} else if (dotsec) {
		const dotSecContents = fs.readFileSync(dotsec, "utf8");
		envContents = await encryptionPlugin.decrypt(dotSecContents);
		console.log("envContents", envContents);
	} else {
	}
	if (envContents) {
		const dotenvVars = parse(envContents);
		Object.entries(dotenvVars).map(([key, value]) => {
			process.env[key] = value;
		});
	} else {
		throw new Error("No .env or .sec file provided");
	}
};

const dotsec = {
	config,
};

export default dotsec;
