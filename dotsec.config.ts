import type { DotsecPluginAws } from "@dotsec/plugin-aws";
import type { DotsecConfig } from "dotsec";

export const dotsec: DotsecConfig<{
	plugins: DotsecPluginAws;
}> = {
	defaults: {
		encryptionEngine: "aws",

		options: {
			showBackgroundColor: true,
			showOutputPrefix: true,
			outputBackgroundColor: "red",
		},
		plugins: {
			aws: {
				kms: {},
			},
		},
	},
	push: {
		ANOTHER_VAR_FOR_SSM: {
			aws: {
				ssm: true,
				secretsManager: true,
			},
		},
	},
	redaction: {
		ignore: ["DEVELOPMENT_STAGE"],
	},
};
