import type { DotsecPluginPKE } from "@dotsec/plugin-pke";
import type { DotsecConfig } from "dotsec";

export const dotsec: DotsecConfig<{
	plugins: DotsecPluginPKE;
}> = {
	defaults: {
		encryptionEngine: "pke",
	},
};
