import { ParameterTier, ParameterType } from "@aws-sdk/client-ssm";

// type Not<T extends { [key: string]: unknown }> = Id<{ [P in keyof T]?: never }>;
type Id<T> = T extends { [key: string]: unknown }
	? Record<string, unknown> & { [P in keyof T]: Id<T[P]> }
	: T;
export const dotSecFileTypes = ["json", "ts", "yaml", "yml"] as const;
export type DotSecFileType = typeof dotSecFileTypes[number];
export type DotSecEncryptedEncoding = "encrypted";
export type DotSecPlaintextEncoding = "plaintext";
export type DotSecEncoding = DotSecPlaintextEncoding | DotSecEncryptedEncoding;
export type DotSecValue =
	| string
	| number
	| boolean
	| { [key: string]: DotSecValue }
	| Array<DotSecValue>;
export type SSMParameterObject = {
	type: "ssm";
	description?: string;
	ssm?: {
		type?: ParameterType;
		tier?: ParameterTier;
	};
	value: DotSecValue;
	encryptedValue?: never;
};
export type SSMEncryptedParameterObject = {
	type: "ssm";
	description?: string;
	value?: never;
	encryptedValue: string;
};
export type StandardParameterObject = {
	type: "standard";
	description?: string;
	value: DotSecValue;
	dontStore?: boolean;
	encryptedValue?: never;
};
export type StandardEncryptedParameterObject = {
	type: "standard";
	description?: string;
	value?: never;
	encryptedValue: string;
};
export type SSMParameter<
	Encoding extends DotSecEncoding = DotSecPlaintextEncoding,
> = Encoding extends DotSecPlaintextEncoding
	? SSMParameterObject
	: SSMEncryptedParameterObject;
export type StandardParameter<
	Encoding extends DotSecEncoding = DotSecPlaintextEncoding,
> = Encoding extends DotSecPlaintextEncoding
	? string | number | boolean | StandardParameterObject
	: StandardEncryptedParameterObject;

export type DotSecSecretsManagerParameter = {
	value: DotSecValue;
	encryptedValue?: never;
};

export type SecretsManagerParameter<
	Encoding extends DotSecEncoding = DotSecPlaintextEncoding,
> = {
	type: "secretsManager";
	description?: string;
} & (Encoding extends DotSecPlaintextEncoding
	? DotSecSecretsManagerParameter
	: {
			type: "secretsManager";

			value?: never;
			encryptedValue: string;
	  });

export type DotSecLeaf<
	Encoding extends DotSecEncoding /* = DotSecPlainTextEncoding */,
> =
	| SSMParameter<Encoding>
	| SecretsManagerParameter<Encoding>
	| StandardParameter<Encoding>;

export type DotSecTree<
	Encoding extends DotSecEncoding,
	TreeShape extends DotSecTreeShape,
> = {
	[key: string]: TreeShape extends DotSecExpandedTree
		? DotSecLeaf<Encoding> | DotSecTree<Encoding, TreeShape>
		: DotSecLeaf<Encoding>;
};
type DotSecFlatTree<Encoding extends DotSecEncoding = DotSecPlaintextEncoding> =
	DotSecTree<Encoding, DotSecExpandedTree>;

export type DeepPartial<T> = T extends object
	? {
			[P in keyof T]?: DeepPartial<T[P]>;
	  }
	: T;

export type OptionalDeepPartial<
	T,
	IgnorePartials extends boolean = false,
> = IgnorePartials extends true
	? T
	: T extends object
	? {
			[P in keyof T]?: DeepPartial<T[P]>;
	  }
	: T;
export type DotSecConfig<
	ConfigDemand extends DotSecConfigDemand = DotSecWithOptionalConfig,
> = OptionalDeepPartial<
	{
		config: {
			pathPrefix?: string;
			useTopLevelsAsEnvironments?: boolean;
			standardParameterStorageType?: "none" | "ssm" | "secretsManager";
			aws: {
				keyAlias: string;
				regions: Array<string>;
				// environmentMapping?: {
				//     [awsEnvironment: string]: {
				//         accountId: string;
				//         accessKeyId: string;
				//         secretAccessKey: string;
				//     };
				// };
			};
		};
	},
	ConfigDemand extends DotSecWithOptionalConfig ? false : true
>;
export type DotSecPlainTextByFileType = {
	fileType: DotSecFileType;
	path: string;
	dotSecPlainText: DotSecPlainText;
	raw: string;
};
export type DotSecEncryptedByFileType = {
	fileType: DotSecFileType;
	path: string;
	dotSecEncrypted: DotSecEncrypted;
};
export type DotSecRequiredConfig = DotSecConfig<DotSecWithRequiredConfig>;
export type DotSecTrees =
	| DotSecTree<DotSecPlaintextEncoding, DotSecExpandedTree>
	| DotSecTree<DotSecEncryptedEncoding, DotSecExpandedTree>
	| DotSecTree<DotSecPlaintextEncoding, DotSecFlattenedTree>
	| DotSecTree<DotSecEncryptedEncoding, DotSecFlattenedTree>;

export type DotSec<
	Tree extends DotSecTrees = DotSecTree<
		DotSecPlaintextEncoding,
		DotSecExpandedTree
	>,
	Encoding extends DotSecEncoding = DotSecPlaintextEncoding,
	Flattened extends DotSecTreeShape = DotSecExpandedTree,
	WithRequiredConfig extends DotSecConfigDemand = DotSecWithOptionalConfig,
> = DS<Tree, Encoding, Flattened, WithRequiredConfig>;

export type DS<
	Tree extends DotSecTrees,
	Encoding extends DotSecEncoding = DotSecPlaintextEncoding,
	Flattened extends DotSecTreeShape = DotSecExpandedTree,
	WithRequiredConfig extends DotSecConfigDemand = DotSecWithOptionalConfig,
> = DotSecConfig<WithRequiredConfig> &
	(Encoding extends DotSecPlaintextEncoding
		? {
				plaintext: Tree extends DotSecTree<DotSecPlaintextEncoding, Flattened>
					? Tree
					: never;
				encrypted?: never;
		  }
		: {
				encrypted: Tree extends DotSecTree<DotSecEncryptedEncoding, Flattened>
					? Tree
					: never;
				plaintext?: never;
		  });

export type DotSecFlattenedTree = "flattened";
export type DotSecExpandedTree = "expanded";
export type DotSecTreeShape = DotSecFlattenedTree | DotSecExpandedTree;
export type DotSecWithOptionalConfig = "with-optional-config";
export type DotSecWithRequiredConfig = "with-required-config";
export type DotSecConfigDemand =
	| DotSecWithOptionalConfig
	| DotSecWithRequiredConfig;
export type DotSecEncrypted<
	T extends DotSecTree<
		DotSecEncryptedEncoding,
		DotSecExpandedTree
	> = DotSecTree<DotSecEncryptedEncoding, DotSecExpandedTree>,
> = DotSec<T, DotSecEncryptedEncoding>;

export type DotSecPlainText<
	T extends DotSecTree<
		DotSecPlaintextEncoding,
		DotSecExpandedTree
	> = DotSecTree<DotSecPlaintextEncoding, DotSecExpandedTree>,
> = DotSec<T, DotSecPlaintextEncoding>;

export type DotSecPlainTextWithOptionalConfig<
	T extends DotSecTree<
		DotSecPlaintextEncoding,
		DotSecExpandedTree
	> = DotSecTree<DotSecPlaintextEncoding, DotSecExpandedTree>,
> = DotSec<
	T,
	DotSecPlaintextEncoding,
	DotSecExpandedTree,
	DotSecWithOptionalConfig
>;
export type DotSecEncryptedWithOptionalConfig<
	T extends DotSecTree<
		DotSecEncryptedEncoding,
		DotSecExpandedTree
	> = DotSecTree<DotSecEncryptedEncoding, DotSecExpandedTree>,
> = DotSec<
	T,
	DotSecEncryptedEncoding,
	DotSecExpandedTree,
	DotSecWithOptionalConfig
>;

// user types
export type DotSecVariables<
	T extends DotSecTree<
		DotSecPlaintextEncoding,
		DotSecExpandedTree
	> = DotSecTree<DotSecPlaintextEncoding, DotSecExpandedTree>,
> = DotSec<
	T,
	DotSecPlaintextEncoding,
	DotSecExpandedTree,
	DotSecWithOptionalConfig
>;

export type DotSecPlainTextFlattened<
	T extends DotSecTree<
		DotSecPlaintextEncoding,
		DotSecFlattenedTree
	> = DotSecTree<DotSecPlaintextEncoding, DotSecFlattenedTree>,
> = DotSec<T, DotSecPlaintextEncoding, DotSecFlattenedTree>;

export type DotSecEncryptedFlattened<
	T extends DotSecTree<
		DotSecEncryptedEncoding,
		DotSecFlattenedTree
	> = DotSecTree<DotSecEncryptedEncoding, DotSecFlattenedTree>,
> = DotSec<T, DotSecEncryptedEncoding, DotSecFlattenedTree>;

export const environments = ["dev", "prod"] as const;
export type Environment = typeof environments[number];
const dotSecPlainText: DotSecPlainText = {
	plaintext: {
		foo: { type: "ssm", value: "asd" },
		bar: { foo: { type: "ssm", value: "asd" } },
	},
};
const dotSecEncrypted: DotSecEncrypted = {
	encrypted: {
		foo: { type: "ssm", encryptedValue: "asd" },
		bar: { foo: { type: "ssm", encryptedValue: "asd" } },
	},
};
const dotSecPlainTextFlattened: DotSecPlainTextFlattened = {
	plaintext: {
		foo: { type: "ssm", value: "asd" },
	},
};
const dotSecEncryptedFlattened: DotSecEncryptedFlattened = {
	encrypted: {
		foo: { type: "secretsManager", encryptedValue: "asd" },
	},
};
const t: DotSec<
	{
		[key in Environment]: {
			other: {
				foo: StandardParameter;
				bar: SSMParameter;
				shit: {
					another: SecretsManagerParameter;
					mekker: SSMParameter;
				};
			};
		};
	},
	DotSecPlaintextEncoding
> = {
	plaintext: {
		dev: {
			other: {
				foo: "123",
				bar: { type: "ssm", value: "asd" },
				shit: {
					another: { type: "secretsManager", value: "qasd" },
					mekker: { type: "ssm", value: "off" },
				},
			},
		},
		prod: {
			other: {
				foo: "123",
				bar: { type: "ssm", value: "asd" },
				shit: {
					another: {
						type: "secretsManager",
						value: "asdasd",
					},
					mekker: { type: "ssm", value: "on" },
				},
			},
		},
	},
};

const tt: DotSec = {
	plaintext: {
		dev: {
			other: {
				foo: "123",
				bar: { type: "ssm", value: "asd" },
				shit: {
					another: { type: "secretsManager", value: "qasd" },
					mekker: 123,
				},
			},
		},
		prod: {
			other: {
				foo: "123",
				bar: { type: "ssm", value: "asd" },
				shit: {
					another: {
						type: "secretsManager",
						value: "asdasd",
					},
					mekker: { type: "ssm", value: "fuck off" },
				},
			},
		},
	},
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

export const isSSMParameterObject = (
	value: unknown,
): value is SSMParameterObject => {
	const ssmParameter = value as SSMParameter;
	return (
		typeof ssmParameter === "object" &&
		ssmParameter !== null &&
		"type" in ssmParameter &&
		ssmParameter.type === "ssm"
	);
};

export const isSSMParameter = <Encoding extends DotSecEncoding>(
	leafOrTree: unknown,
): leafOrTree is SSMParameter<Encoding> => {
	const ssmParameter = leafOrTree as SSMParameter<Encoding>;
	return (
		typeof ssmParameter === "object" &&
		ssmParameter !== null &&
		"type" in ssmParameter &&
		ssmParameter.type === "ssm"
	);
};

export const isRegularParameterObject = (
	value: unknown,
): value is StandardParameterObject => {
	const regularParameter = value as StandardParameter;
	return (
		typeof regularParameter === "object" &&
		regularParameter !== null &&
		"type" in regularParameter &&
		regularParameter.type === "standard"
	);
};

export const isRegularParameter = <Encoding extends DotSecEncoding>(
	leafOrTree: unknown,
): leafOrTree is StandardParameter<Encoding> => {
	const leaf = leafOrTree as StandardParameter<Encoding>;
	return (
		isString(leaf) ||
		isNumber(leaf) ||
		isBoolean(leaf) ||
		isRegularParameterObject(leaf)
	);
};

export const isEncryptedSSMParameter = (
	leafOrTree: unknown,
): leafOrTree is SSMParameter<DotSecEncryptedEncoding> => {
	const leaf = leafOrTree as SSMParameter<DotSecEncryptedEncoding>;
	return (
		leaf.type !== undefined &&
		leaf.type === "ssm" &&
		leaf.encryptedValue !== undefined
	);
};

export const isEncryptedRegularParameter = (
	leafOrTree: unknown,
): leafOrTree is StandardParameter<DotSecEncryptedEncoding> => {
	const leaf = leafOrTree as StandardParameter<DotSecEncryptedEncoding>;
	return (
		leaf.type !== undefined &&
		leaf.type === "standard" &&
		leaf.encryptedValue !== undefined
	);
};

export const isSecretsManagerParameter = <Encoding extends DotSecEncoding>(
	leafOrTree: unknown,
): leafOrTree is SecretsManagerParameter<Encoding> => {
	const leaf = leafOrTree as SecretsManagerParameter<Encoding>;
	return (
		leaf.type !== undefined &&
		leaf.type === "secretsManager" &&
		!(isString(leaf) || isNumber(leaf) || isBoolean(leaf))
	);
};

export const isDotSecTree = <Encoding extends DotSecEncoding>(
	leafOrTree: unknown,
): leafOrTree is DotSecTree<Encoding, DotSecExpandedTree> => {
	if (
		typeof leafOrTree === "object" &&
		!Array.isArray(leafOrTree) &&
		leafOrTree !== null &&
		!isSSMParameter(leafOrTree) &&
		!isRegularParameter(leafOrTree) &&
		!isEncryptedSSMParameter(leafOrTree) &&
		!isEncryptedRegularParameter(leafOrTree) &&
		!isSecretsManagerParameter(leafOrTree)
	) {
		return true;
	}

	return false;
};

export const isDotSecPlaintTextTree = <Encoding extends DotSecEncoding>(
	leafOrTree: unknown,
): leafOrTree is DotSecTree<Encoding, DotSecExpandedTree> => {
	if (
		typeof leafOrTree === "object" &&
		!Array.isArray(leafOrTree) &&
		leafOrTree !== null &&
		!isSSMParameter(leafOrTree) &&
		!isRegularParameter(leafOrTree) &&
		!isSecretsManagerParameter(leafOrTree)
	) {
		return true;
	}

	return false;
};
