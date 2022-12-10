import { EncryptionAlgorithmSpec, KeySpec } from "@aws-sdk/client-kms";

export const secretsManagerAvailableCases = [
	"camelCase",
	"constantCase",
	"dotCase",
	"headerCase",
	"noCase",
	"paramCase",
	"pascalCase",
	"pathCase",
	"snakeCase",
] as const;

export const keySpecAlgorithmPayloadMaxByteSizes: {
	[key in KeySpec]?: {
		[key in EncryptionAlgorithmSpec]?: number;
	};
} = {
	SYMMETRIC_DEFAULT: {
		SYMMETRIC_DEFAULT: 4096,
	},
	RSA_2048: {
		RSAES_OAEP_SHA_1: 214,
		RSAES_OAEP_SHA_256: 190,
	},
	RSA_3072: {
		RSAES_OAEP_SHA_1: 342,
		RSAES_OAEP_SHA_256: 318,
	},

	RSA_4096: {
		RSAES_OAEP_SHA_1: 470,
		RSAES_OAEP_SHA_256: 446,
	},
	SM2: {
		SM2PKE: 1024,
	},
} as const;
