export type { DotsecConfig as Dotsec } from "./types";
export type {
	DotsecConfig,
	EncryptionEngine,
	EncryptionEngineFactory,
	EncryptionEngineFactoryProps,
	EncryptionPlugin,
} from "./types";
export type {
	DotsecAwsPlugin,
	DotsecGitHubPlugin,
	DotsecPluginModule,
} from "./types";
export type {
	MagicalDotsecConfig,
	MagicalDotsecPlugin,
	MagicalDotsecPluginModule,
} from "./lib/plugin";
import dotsec from "./dotsec";
export default dotsec;
