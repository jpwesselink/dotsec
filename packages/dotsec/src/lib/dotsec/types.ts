import { OptionalDeepPartial } from '../../types';
type RegionOptions =
    | { onlyInRegions: Array<string>; andInRegions?: never }
    | { onlyInRegions?: never; andInRegions: Array<string> };
export const configFileTypes = ['json'] as const;
export type ConfigFileType = typeof configFileTypes[number];
// config types

// unencrypted types
// partial config

export type DotSecExpandValues = true;
export type DotSecCollapseValues = false;
export type DotSecEncryptedValues = true;
export type DotSecPlainTextValues = false;
export type DotSecFullConfig = true;
export type DotSecPartialConfig = false;

export type DotSecConfig<IgnorePartialConfig extends boolean = false> =
    OptionalDeepPartial<
        {
            config: {
                pathPrefix?: string;
                aws: {
                    keyAlias: string;
                    regions: Array<string>;
                };
            };
        },
        IgnorePartialConfig
    >;
export type DotSecValuesByType<
    ExpandVariables extends boolean = false,
    Encrypted extends boolean = false,
> = {
    parameterStore?: DotSecParameterStoreValues<ExpandVariables, Encrypted>;
    secretsManager?: DotSecSecretsManagerValues<ExpandVariables, Encrypted>;

    /**
     * { [key: string]: Stuff | }
     */
};
export type DotSecFile<
    IgnorePartialConfig extends boolean = false,
    ExpandVariables extends boolean = false,
    Encrypted extends boolean = false,
> = DotSecConfig<IgnorePartialConfig> &
    DotSecValuesByType<ExpandVariables, Encrypted>;

export type DotSecParameterStoreValues<
    ExpandVariables extends boolean = false,
    Encrypted extends boolean = false,
> = Record<string, DotSecParameterStoreValue<ExpandVariables, Encrypted>>;

export type BothOrSecond<
    T,
    U,
    OnlySecond extends boolean,
> = OnlySecond extends true ? U : T | U;

export type DotSecCommonOptions = {
    __dotsec_halt__?: boolean;
};
export type DotSecParameterStoreOptions = {
    stuff: string;
};

export type DotSecLiteral = string | number | boolean;

// export type DSParameterStoreValue<
//     ExpandVariables extends boolean = false,
//     Encrypted extends boolean = false,
// > = BothOrSecond<
//     DSLiteral,
//     (Encrypted extends true
//         ? {
//               encryptedValue: string;
//           }
//         : { value: DSLiteral }) &
//         DSParameterStoreOptions &
//         DSCommonOptions,
//     ExpandVariables
// >;

export type DotSecParameterStoreValue<
    ExpandVariables extends boolean = false,
    Encrypted extends boolean = false,
> = DotSecValue<DotSecParameterStoreOptions, ExpandVariables, Encrypted>;

export type DotSecValue<
    DSStoragSpecificProperties extends Record<string, unknown>,
    ExpandVariables extends boolean = false,
    Encrypted extends boolean = false,
> = BothOrSecond<
    DotSecLiteral,
    (Encrypted extends true
        ? {
              encryptedValue: string;
          }
        : { value: DotSecLiteral }) &
        DSStoragSpecificProperties &
        DotSecCommonOptions,
    ExpandVariables
>;

// export type DSValue<
//     DSStoragSpecificProperties extends Record<string, unknown>,
//     ExpandVariables extends boolean = false,
//     Encrypted extends boolean = false,
// > = BothOrSecond<
//     DSLiteral,
//     (Encrypted extends true
//         ? {
//               encryptedValue: string;
//           }
//         : { value: DSLiteral }) &
//         DSStoragSpecificProperties &
//         DSCommonOptions,
//     ExpandVariables
// >;
type Vies = string | { [key: string]: Vies };
const v: Vies = {
    mekker: {
        blaat: '123',
    },
};
export type DotSecSecretsManagerValues<
    ExpandVariables extends boolean = false,
    Encrypted extends boolean = false,
> =
    | DotSecSecretsManagerValue<ExpandVariables, Encrypted>
    | {
          [key: string]: DotSecSecretsManagerValues<ExpandVariables, Encrypted>;
      };

export type DotSecSecretsManagerOptions = { secretThing: string };
export type DotSecSecretsManagerValue<
    ExpandVariables extends boolean = false,
    Encrypted extends boolean = false,
> = DotSecValue<DotSecSecretsManagerOptions, ExpandVariables, Encrypted>;

// export type DSSecretsManagerValue<
//     ExpandVariables extends boolean = false,
//     Encrypted extends boolean = false,
// > = BothOrSecond<
//     DSLiteral,
//     (Encrypted extends true
//         ? {
//               encryptedValue: string;
//           }
//         : { value: DSLiteral }) &
//         DSSecretsManagerOptions &
//         DSCommonOptions,
//     ExpandVariables
// >;

export const isDotSecLiteral = (literal: unknown): literal is DotSecLiteral => {
    if (
        typeof literal === 'string' ||
        typeof literal === 'number' ||
        typeof literal === 'boolean'
    ) {
        return true;
    }
    return false;
};
const ds: DotSecFile<true, false, false> = {
    config: {
        aws: {
            keyAlias: 'alias/blah',
            regions: ['us-east-1', 'us-west-2'],
        },
    },
    secretsManager: {
        asdasd: {
            miffy: {
                value: 'asdd',
                secretThing: 123,
            },
        },
        mekker: {
            value: 'asd',
            stuff: 'haha',
        },
    },
    parameterStore: {
        mekker: {
            value: 'asd',
        },
    },
};

type FF = typeof ds['parameterStore'];
