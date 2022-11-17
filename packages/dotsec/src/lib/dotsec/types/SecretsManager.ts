import {
    DotSecCommonProps,
    DotSecLiteral,
    EncryptedValueObject,
    IsFlat,
    IsTree,
    Not,
    PlainTextValueObject,
} from './common';

export type DotSecSecretsManagerProps = { description?: string };
export type DotSecEncryptedSecretsManagerProps = DotSecSecretsManagerProps &
    EncryptedValueObject &
    DotSecCommonProps;

export type DotSecPlainTextSecretsManagerProps = DotSecSecretsManagerProps &
    PlainTextValueObject &
    DotSecCommonProps;
export type DotSecPlainTextSecretsManagerValues<
    FlatOrTree extends IsFlat | IsTree,
> = {
    [key: string]: FlatOrTree extends IsFlat
        ? DotSecPlainTextSecretsManagerProps | DotSecLiteral
        :
              | DotSecLiteral
              | DotSecPlainTextSecretsManagerProps
              | (DotSecPlainTextSecretsManagerValues<IsTree> &
                    Not<DotSecPlainTextSecretsManagerProps>);
} & Not<DotSecPlainTextSecretsManagerProps>;

export type DotSecEncryptedSecretsManagerValues<
    FlatOrTree extends IsFlat | IsTree,
> = {
    [key: string]: FlatOrTree extends IsFlat
        ? DotSecEncryptedSecretsManagerProps | DotSecLiteral
        :
              | DotSecLiteral
              | DotSecEncryptedSecretsManagerProps
              | (DotSecEncryptedSecretsManagerValues<IsTree> &
                    Not<DotSecEncryptedSecretsManagerProps>);
} & Not<DotSecEncryptedSecretsManagerProps>;

const treeishPlainTextSecretManager: DotSecPlainTextSecretsManagerValues<IsTree> =
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

const f: DotSecPlainTextSecretsManagerValues<IsTree> = {
    secretsManager: {
        sss: 'asds',
        foo: {
            description: 'asd',
            value: 'asd',
        },
    },
};
const g: DotSecPlainTextSecretsManagerValues<IsFlat> = {
    sss: 'asds',
    foo: {
        descricxption: 'asd',
        sad: 123,
        value: 'asd',
    },
};
