import { Credentials } from '@aws-sdk/types';
import yargs, { Options } from 'yargs';

export type YargsHandlerParams<T extends { [key: string]: Options }> = yargs.ArgumentsCamelCase<
    yargs.Omit<Record<string, unknown>, keyof T> & yargs.InferredOptionTypes<T>
>;

export type ValueAndOrigin<T, U = string> = {
    value: T;
    origin: U;
};

export type CredentialsAndOrigin = ValueAndOrigin<Credentials>;
export type ProfileAndOrigin = ValueAndOrigin<string>;
export type RegionAndOrigin = ValueAndOrigin<string>;
