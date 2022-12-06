import { MagicalDotsecConfig } from "./packages/dotsec/src/index";
import { DotsecPluginAws } from "./packages/plugin-aws/src/index";

// type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

// // expands object types recursively
// type ExpandRecursively<T> = T extends object
// 	? T extends infer O
// 		? { [K in keyof O]: ExpandRecursively<O[K]>
// 		  }
// 		: never
// 	: T;

export const dotsec: MagicalDotsecConfig<{
	plugins: DotsecPluginAws;
}> = {
	plugins: {
		aws: {
			module: "@dotsec/plugin-aws",
			region: "eu-central-1",
			kms: {
				keyAlias: "alias/dotsec",
			},
			ssm: {
				type: "SecureString",
			},
		},
	},
	// push: {
	// 	variables: ["XXXXXX"],
	// 	to: {
	// 		aws: {
	// 			ssm: true,
	// 		},
	// 	},
	// },
	// variables: {
	// 	XXX: {
	// 		push: {
	// 			aws: {
	// 				ssm: false,
	// 				secretsManager: false,
	// 			},
	// 		},
	// 	},
	// },
};
