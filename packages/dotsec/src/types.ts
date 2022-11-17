import { Credentials } from '@aws-sdk/types';
import yargs, { Options } from 'yargs';

export type YargsHandlerParams<T extends { [key: string]: Options }> =
    yargs.ArgumentsCamelCase<
        yargs.Omit<Record<string, unknown>, keyof T> &
            yargs.InferredOptionTypes<T>
    >;

export type ValueAndOrigin<T, U = string> = {
    value: T;
    origin: U;
};

export type CredentialsAndOrigin = ValueAndOrigin<Credentials>;
export type ProfileAndOrigin = ValueAndOrigin<string>;
export type RegionAndOrigin = ValueAndOrigin<string>;

type Config = {
    region?: string;
    account?: string;
    pathPrefix?: string; // "/";
    key?: { arn: string; aliasArn?: never } | { arn?: never; aliasArn: string };
    parseOptions?: {
        types?: {
            ssm?: {
                secureStrings?: {
                    pathMatches: string[];
                };
            };
        };
    };
};

export type Not<T extends { [key: string]: unknown }> = {
    [P in keyof T]?: never;
};

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

export type Parameter = string;

export type Secrets = {
    config?: Config;

    parameters: Record<
        string,
        | Parameter
        | Record<
              string,
              | Parameter
              | Record<
                    string,
                    | Parameter
                    | Record<string, Parameter | Record<string, Parameter>>
                >
          >
    >;
};
export type ParameterValue = string | number | boolean;

export type EncryptedSecrets = {
    config?: Config;
    encryptedParameters: Record<string, string>;
};
