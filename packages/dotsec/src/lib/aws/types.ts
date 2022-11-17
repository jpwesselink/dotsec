import { DeepPartial, OptionalDeepPartial } from '../../types';
type RegionOptions =
    | { onlyInRegions: Array<string>; andInRegions?: never }
    | { onlyInRegions?: never; andInRegions: Array<string> };
export const configFileTypes = ['json'] as const;
export type ConfigFileType = typeof configFileTypes[number];
// config types
export type AWSVariablesConfigRequired = {
    config: {
        pathPrefix?: string;
        aws: {
            keyAlias: string;
            regions: Array<string>;
        };
    };
};
export type AWSVariablesConfig = DeepPartial<AWSVariablesConfigRequired>;

// plain text types
export type AWSSecretsManagerValueExpanded = {
    value: AWSValueType;
} & RegionOptions;
export type AWSSecretsManagerValue =
    | AWSSecretsManagerValueExpanded
    | AWSValueType;
export type AWSSecretsManagerValues = { [key: string]: AWSSecretsManagerValue };
//
export type SSMType = 'string' | 'secureString';
export type AWSParmaterStoreValueExpanded = {
    value: AWSValueType;
    type: SSMType;
} & RegionOptions;
export type AWSParameterStoreValue =
    | AWSParmaterStoreValueExpanded
    | AWSValueType;
export type AWSParameterStoreValues = { [key: string]: AWSParameterStoreValue };

export type AWSVariablesByStorage = {
    secretsManager?: AWSSecretsManagerValues;
    parameterStore?: AWSParameterStoreValues;
};
export type AWSVariablesConfigByType = {
    type: ConfigFileType;
    config: AWSVariablesRequired;
};
export type AWSEncryptedVariablesConfigByFileType = {
    type: ConfigFileType;
    config: AWSEncryptedVariablesRequired;
};

export type AWSVariablesRequired = AWSVariablesConfigRequired &
    AWSVariablesByStorage;
export type AWSVariables = AWSVariablesConfig & AWSVariablesByStorage;

// encrypted types
export type AWSEncryptedSecretsManagerValueExpanded = {
    encryptedValue: string;
} & RegionOptions;
export type AWSEncryptedSecretsManagerValue =
    | AWSEncryptedSecretsManagerValueExpanded
    | AWSEncryptedValueType;

export type AWSEncryptedSecretsManagerValues = {
    [key: string]: AWSEncryptedSecretsManagerValue;
};
export type AWSEncryptedParmaterStoreValueExpanded = {
    encryptedValue: string;
    type: SSMType;
} & RegionOptions;
export type AWSEncryptedParameterStoreValue =
    | AWSEncryptedParmaterStoreValueExpanded
    | AWSEncryptedValueType;
export type AWSEncryptedParameterStoreValues = {
    [key: string]: AWSEncryptedParameterStoreValue;
};

export type AWSEncryptedVariablesByStorage = {
    secretsManager?: AWSEncryptedSecretsManagerValues;
    parameterStore?: AWSEncryptedParameterStoreValues;
};

export type AWSEncryptedVariables = AWSVariablesConfig &
    AWSEncryptedVariablesByStorage;
export type AWSEncryptedVariablesRequired = AWSVariablesConfigRequired &
    AWSEncryptedVariablesByStorage;

// export types
export type AWSStorageType = keyof AWSVariablesByStorage;
export type AWSParameterStoreExport = {
    path: string;
    value: string;
    regions: Array<string>;
    parameterStoreValue: AWSParameterStoreValue;
};
export type AWSParameterStoreExports = Array<AWSParameterStoreExport>;
export type AWSSecretsManagerExport = {
    path: string;
    value: string;
    regions: Array<string>;
    secretsManagerValue: AWSSecretsManagerValue;
};
export type AWSSecretsManagerExports = Array<AWSSecretsManagerExport>;

export type AWSStorageVariables = {
    secretsManagerExports: AWSSecretsManagerExports;
    parameterStoreExports: AWSParameterStoreExports;
};
export type AWSValueLiteral = string | number | boolean;
export type AWSEncryptedValueLiteral = string;
export type AWSValueObject = Record<string, unknown>;
export type AWSValueType = AWSValueLiteral | AWSValueObject;
export type AWSEncryptedValueType = AWSEncryptedValueLiteral;

// unencrypted types
// partial config
export type DSConfig<IgnorePartialConfig extends boolean = false> =
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
export type DSValuesByType<
    ExpandVariables extends boolean = false,
    Encrypted extends boolean = false,
> = {
    parameterStore?: DSParameterStoreValues<ExpandVariables, Encrypted>;
    secretsManager?: DSSecretsManagerValues<ExpandVariables, Encrypted>;
};
export type DotSecFile<
    IgnorePartialConfig extends boolean = false,
    ExpandVariables extends boolean = false,
    Encrypted extends boolean = false,
> = DSConfig<IgnorePartialConfig> & DSValuesByType<ExpandVariables, Encrypted>;

export type DSParameterStoreValues<
    ExpandVariables extends boolean = false,
    Encrypted extends boolean = false,
> = Record<string, DSParameterStoreValue<ExpandVariables, Encrypted>>;

export type BothOrSecond<
    T,
    U,
    OnlySecond extends boolean,
> = OnlySecond extends true ? U : T | U;

export type DSCommonOptions = {
    __dotsec_halt__?: boolean;
};
export type DSParameterStoreOptions = {
    stuff: string;
};

export type DSLiteral = string | number | boolean;

export type DSParameterStoreValue<
    ExpandVariables extends boolean = false,
    Encrypted extends boolean = false,
> = BothOrSecond<
    DSLiteral,
    (Encrypted extends true
        ? {
              encryptedValue: string;
          }
        : { value: DSLiteral }) &
        DSParameterStoreOptions &
        DSCommonOptions,
    ExpandVariables
>;

export type DSSecretsManagerValues<
    ExpandVariables extends boolean = false,
    Encrypted extends boolean = false,
> = Record<string, DSSecretsManagerValue<ExpandVariables, Encrypted>>;

export type DSSecretsManagerOptions = { secretThing: string };
export type DSSecretsManagerValue<
    ExpandVariables extends boolean = false,
    Encrypted extends boolean = false,
> = BothOrSecond<
    DSLiteral,
    (Encrypted extends true
        ? {
              encryptedValue: string;
          }
        : { value: DSLiteral }) &
        DSSecretsManagerOptions &
        DSCommonOptions,
    ExpandVariables
>;

// export const ds: DotSecFile<true, false, false> = {
//     parameterStore: {
//         asdasd: {
//             value: 'asdasd',
//             stuff: 'haha',
//         },
//         mekker: {
//             value: 'asd',
//             stuff: 'haha',
//         },
//     },
// };
