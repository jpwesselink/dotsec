import type { Dotsec } from "dotsec";

export const dotsec: Dotsec = {
	config: {
		aws: {
			region: "us-east-1",
			kms: {
				keyAlias: "alias/dotsec",
			},
		},
	},
};
