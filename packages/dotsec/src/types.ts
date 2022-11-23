// utility types
export type DeepPartial<T> = T extends object
	? {
			[P in keyof T]?: DeepPartial<T[P]>;
	  }
	: T;

export type EncryptionEngineFactoryProps = { verbose?: boolean };
export type EncryptionEngine<T = {}> = {
	encrypt(plaintext: string): Promise<string>;
	decrypt(ciphertext: string): Promise<string>;
} & T;

export type EncryptionEngineFactory<
	T = {},
	V extends Record<string, unknown> = {},
> = {
	(options: EncryptionEngineFactoryProps & T): Promise<EncryptionEngine<V>>;
};

export abstract class EncryptionPlugin {
	protected verbose: boolean | undefined;
	constructor(options: EncryptionEngineFactoryProps) {
		this.verbose = options?.verbose;
	}
	abstract encrypt(plaintext: string): Promise<string>;
	abstract decrypt(ciphertext: string): Promise<string>;
}

export type DotsecConfig = {
	config?: {
		aws?: {
			region?: string;
			kms?: {
				keyAlias?: string;
				encryptionAlgorithm?:
					| "RSAES_OAEP_SHA_1"
					| "RSAES_OAEP_SHA_256"
					| "SYMMETRIC_DEFAULT";
			};
		};
	};
	env?: {
		[key: string]: {
			skip?: boolean;
			type?: "string" | "number" | "boolean" | "json";
			sync?: {
				ssm?: boolean;
				secretsManager?: boolean;
				githubSecrets?: boolean;
			};
		};
	};
};

// Dotsec config file
export type DotsecConfigAndSource = {
	source: "json" | "ts" | "defaultConfig";
	contents: DotsecConfig;
};

// CLI types
export type GlobalCommandOptions = {
	configFile: string;
	verbose: false;
};

export type Init2CommandOptions = {
	configFile: string;
	verbose: false;
	env: string;
	sec: string;
	yes: boolean;
	awskeyAlias: string;
	awsRegion?: string;
	performInit: (encryptionEngine: EncryptionEngine) => Promise<void>;
};

export type RunCommandOptions = GlobalCommandOptions & {
	env?: string;
	sec?: string;
	keyAlias?: string;
	region?: string;
};

export const isString = (value: unknown): value is string => {
	return typeof value === "string";
};

export const isNumber = (value: unknown): value is number => {
	return typeof value === "number";
};
export const isBoolean = (value: unknown): value is boolean => {
	return typeof value === "boolean";
};
