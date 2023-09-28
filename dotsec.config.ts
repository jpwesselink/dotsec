import type { DotsecPluginAws } from "@dotsec/plugin-aws";
import type { DotsecConfig } from "dotsec";

export const dotsec: DotsecConfig<{
	plugins: DotsecPluginAws;
}> = {
	defaults: {
		encryptionEngine: "aws",
		options: {
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
		show: ["SPECIAL_ONE_FOR_SECRETS_MANAGER_AGAIN"],
	},
};
