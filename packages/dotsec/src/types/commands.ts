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
	env: string;
	sec: string;
	engine: string;
	yes: boolean;
};
export type DecryptCommandOptions = GlobalCommandOptions & {
	env: string;
	sec: string;
	engine: string;
	yes: boolean;
};
export type PushCommandOptions = GlobalCommandOptions & {
	verbose?: boolean;
	env?: string;
	sec?: string;
	withEnv?: boolean;
	withSec?: boolean;
	engine: string;
	yes: boolean;
};

export type RunCommandOptions = GlobalCommandOptions & {
	env?: string;
	sec?: string;
	withEnv?: boolean;
	withSec?: boolean;
	engine: string;
};
