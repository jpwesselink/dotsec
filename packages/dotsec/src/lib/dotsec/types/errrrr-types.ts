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

// booleanics
type DotSecPartialConfiguration = false;
type DotSecFullConfiguration = true;

// configuration
export type DotSecConfig<
    AcceptPartialConfiguration extends
        | DotSecPartialConfiguration
        | DotSecFullConfiguration = DotSecPartialConfiguration,
> = OptionalDeepPartial<
    {
        config: {
            pathPrefix?: string;
            aws: {
                keyAlias: string;
                regions: Array<string>;
            };
        };
    },
    AcceptPartialConfiguration
>;

type DotSecValueObject = { foo: string; bar: string };
type DotSecParameterStoreObject = { type?: 'String' | 'SecureString' };
type DotSecSecretsManagerObject = { description: string };
type DotSecValueLiteral = string | number | boolean;

type Not<T extends { [key: string]: unknown }> = Id<{ [P in keyof T]?: never }>;
type DotSecExpandObject = true;
type DotSecCollapseObject = false;
type DotSecCollapseTree = false;
type DotSecExpandTree = true;

type DotSecPlainTextObject = {
    value: string | number | boolean | Record<string, unknown>;
};
type DotSecEncryptedObject = { encryptedValue: string };

type DotSecValue<
    ExpandTree extends DotSecCollapseTree | DotSecExpandTree,
    ValueObject extends { [key: string]: unknown },
    ValueLiteral extends DotSecValueLiteral,
    ExpandObject extends DotSecExpandObject | DotSecCollapseObject,
> = ExpandTree extends DotSecExpandTree
    ? ExpandObject extends DotSecExpandObject
        ?
              | ValueObject
              | ({
                    [key: string]: DotSecValue<
                        ExpandTree,
                        ValueObject,
                        ValueLiteral,
                        ExpandObject
                    >;
                } & Not<ValueObject>)
        :
              | ValueLiteral
              | Record<string, unknown>
              | ValueObject
              | ({
                    [key: string]: DotSecValue<
                        ExpandTree,
                        ValueObject,
                        ValueLiteral,
                        ExpandObject
                    >;
                } & Not<ValueObject>)
    : ExpandObject extends DotSecExpandObject
    ? ValueObject
    : ValueLiteral | ValueObject;

type DotSecFlatCollapsePlainTextValues = DotSecValue<
    DotSecCollapseTree,
    DotSecValueObject & DotSecPlainTextObject,
    DotSecValueLiteral,
    DotSecCollapseObject
>;

type DotSecFlatCollapseEncryptedValues = DotSecValue<
    DotSecCollapseTree,
    DotSecValueObject & DotSecEncryptedObject,
    DotSecValueLiteral,
    DotSecCollapseObject
>;
type DSEncryptValue = true;
type DSPlainTextValue = false;

type DotSecValues<
    ExpandTree extends DotSecCollapseTree | DotSecExpandTree,
    ExpandObject extends DotSecExpandObject | DotSecCollapseObject,
    EncryptedValue extends DSEncryptValue | DSPlainTextValue,
> = {
    parameterStore: {
        [key: string]: DotSecValue<
            ExpandTree,
            DotSecParameterStoreObject &
                (EncryptedValue extends true
                    ? DotSecEncryptedObject
                    : DotSecPlainTextObject),
            DotSecValueLiteral,
            ExpandObject
        >;
    };
    secretsManager: Record<
        string,
        DotSecValue<
            ExpandTree,
            Id<
                DotSecSecretsManagerObject &
                    (EncryptedValue extends true
                        ? DotSecEncryptedObject
                        : DotSecPlainTextObject)
            >,
            DotSecValueLiteral,
            ExpandObject
        >
    >;
};

type DotSecFile<
    AcceptPartialConfiguration extends
        | DotSecPartialConfiguration
        | DotSecFullConfiguration,
    ExpandTree extends DotSecCollapseTree | DotSecExpandTree,
    ExpandObject extends DotSecExpandObject | DotSecCollapseObject,
    EncryptedValues extends DSEncryptValue | DSPlainTextValue,
> = DotSecConfig<AcceptPartialConfiguration> & {
    secretsManager: DotSecValue<
        ExpandTree,
        DotSecSecretsManagerObject & DotSecPlainTextObject,
        DotSecValueLiteral,
        ExpandObject
    >;
    parameterStore: DotSecValue<
        ExpandTree,
        DotSecParameterStoreObject & DotSecPlainTextObject,
        DotSecValueLiteral,
        ExpandObject
    >;
};
//  &
// DotSecValues<ExpandTree, ExpandObject, EncryptedValues>;

type Id<T> = T extends { [key: string]: unknown }
    ? {} & { [P in keyof T]: Id<T[P]> }
    : T;

type DotSec = DotSecFile<
    DotSecPartialConfiguration,
    DotSecExpandTree,
    DotSecCollapseObject,
    DSPlainTextValue
>;
type DotSecWithFullConfiguration = Id<
    DotSecFile<
        DotSecPartialConfiguration,
        DotSecExpandTree,
        DotSecCollapseObject,
        DSPlainTextValue
    >
>;

type DotSecFullyConfiguredFlatEncryptedValues = Id<
    DotSecFile<
        DotSecFullConfiguration,
        DotSecCollapseTree,
        DotSecExpandObject,
        DSPlainTextValue
    >
>;

const hoer: DotSecFile<
    DotSecPartialConfiguration,
    DotSecExpandTree,
    DotSecCollapseObject,
    DSPlainTextValue
> = {
    config: { aws: { keyAlias: 'asd', regions: ['asd'] } },
    secretsManager: {
        kak: { value: '123d' },
        blaat: 'asss',
        zaaath: {
            value: 'asd',
            description: 'asd',
        },
    },
    parameterStore: {
        poep: { haha: { value: '123' } },
    },
};
const m: Record<
    string,
    DotSecValue<
        DotSecCollapseTree,
        DotSecSecretsManagerObject & DotSecPlainTextObject,
        DotSecValueLiteral,
        DotSecCollapseObject
    >
> = {
    kak: { value: '123' },
    blaat: 'asss',
    zaaath: {
        value: 'asd',
        description: 'asd',
    },
};
