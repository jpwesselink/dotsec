export type GlobalCommandOptions = {
	configFile: string;
	verbose: false;
};

export type InitCommandOptions = {
	configFile: string;
	verbose?: boolean;
	yes: boolean;
};
export type EncryptCommandOptions = GlobalCommandOptions & {
	envFile: string;
	secFile: string;
	engine: string;
	createManifest: boolean;
	manifestFile: string;
	yes: boolean;
};
export type DecryptCommandOptions = GlobalCommandOptions & {
	envFile: string;
	secFile: string;
	engine: string;
	createManifest: boolean;
	manifestFile: string;
	yes: boolean;
};
export type PushCommandOptions = GlobalCommandOptions & {
	verbose?: boolean;
	envFile?: string;
	secFile?: string;
	using: "env" | "sec";
	// withEnv?: boolean;
	// withSec?: boolean;
	engine: string;
	yes: boolean;
};

export type RunCommandOptions = GlobalCommandOptions & {
	envFile?: string;
	secFile?: string;
	using: "env" | "sec";
	engine: string;
	outputBackgroundColor?: string;
	showOutputPrefix?: boolean;
	outputPrefix?: string;
};
