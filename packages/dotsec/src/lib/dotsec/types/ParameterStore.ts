import {
    DotSecCommonProps,
    DotSecLiteral,
    EncryptedValueObject,
    IsFlat,
    IsTree,
    Not,
    PlainTextValueObject,
} from './common';

export type DotSecParameterStoreProps = {
    description?: string;
    type?: 'String' | 'SecureString';
};
export type DotSecEncryptedParameterStoreProps = DotSecParameterStoreProps &
    EncryptedValueObject &
    DotSecCommonProps;

export type DotSecPlainTextParameterStoreProps = DotSecParameterStoreProps &
    PlainTextValueObject &
    DotSecCommonProps;
export type DotSecPlainTextParameterStoreValues<
    FlatOrTree extends IsFlat | IsTree,
> = {
    [key: string]: FlatOrTree extends IsFlat
        ? DotSecPlainTextParameterStoreProps | DotSecLiteral
        :
              | DotSecLiteral
              | DotSecPlainTextParameterStoreProps
              | (DotSecPlainTextParameterStoreValues<IsTree> &
                    Not<DotSecPlainTextParameterStoreProps>);
} & Not<DotSecPlainTextParameterStoreProps>;

export type DotSecEncryptedParameterStoreValues<
    FlatOrTree extends IsFlat | IsTree,
> = {
    [key: string]: FlatOrTree extends IsFlat
        ? DotSecEncryptedParameterStoreProps | DotSecLiteral
        :
              | DotSecLiteral
              | DotSecEncryptedParameterStoreProps
              | (DotSecEncryptedParameterStoreValues<IsTree> &
                    Not<DotSecEncryptedParameterStoreProps>);
} & Not<DotSecEncryptedParameterStoreProps>;

const treeishPlainTextSecretManager: DotSecPlainTextParameterStoreValues<IsTree> =
    {
        pew: 'asd',
        sss: {
            description: 'asd',
            value: 'asdd',
        },
        www: {
            fffff: {
                othxer: 'sdd',
            },
            foo: {
                bar: {
                    description: 'asd',
                    value: 'asdd',
                },
            },
        },
        zaad: 'asd',
    };

const f: DotSecPlainTextParameterStoreValues<IsTree> = {
    ParameterStore: {
        sss: 'asds',
        foo: {
            description: 'asd',
            value: 'asd',
        },
    },
};
const g: DotSecPlainTextParameterStoreValues<IsFlat> = {
    sss: 'asds',
    foo: {
        descricxption: 'asd',
        sad: 123,
        value: 'asd',
    },
};
