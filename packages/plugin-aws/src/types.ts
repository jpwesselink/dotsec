import { Credentials } from "@aws-sdk/types";

export type ValueAndOrigin<T, U = string> = {
	value: T;
	origin: U;
};

export type CredentialsAndOrigin = ValueAndOrigin<Credentials>;
export type ProfileAndOrigin = ValueAndOrigin<string>;
export type RegionAndOrigin = ValueAndOrigin<string>;
