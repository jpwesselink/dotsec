import type { DotsecConfig } from "dotsec";

export const dotsec: DotsecConfig = {
	config: {
		aws: {
			region: "us-east-1",
			kms: {
				keyAlias: "alias/dotsec",
			},
		},
	},
	variables: {},
};
