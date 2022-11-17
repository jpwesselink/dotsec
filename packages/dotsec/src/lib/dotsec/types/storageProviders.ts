import { IsFlat, IsTree } from './common';
import { DotSecPlainTextParameterStoreValues } from './ParameterStore';
import { DotSecPlainTextSecretsManagerValues } from './SecretsManager';

// type DotSecValues<
//     FlatOrTree extends IsFlat | IsTree,
//     EncryptedOrPlainText extends Encrypted | PlainText,
// > = {
//     parameterStore?: EncryptedOrPlainText extends Encrypted
//         ? DotSecEncryptedParameterStoreValues<FlatOrTree>
//         : DotSecPlainTextParameterStoreValues<FlatOrTree>;
//     secretsManager?: EncryptedOrPlainText extends Encrypted
//         ? DotSecEncryptedSecretsManagerValues<FlatOrTree>
//         : DotSecPlainTextSecretsManagerValues<FlatOrTree>;
// };

export type DotSecPlainTextValues<FlatOrTree extends IsFlat | IsTree> = {
    parameterStore?: DotSecPlainTextParameterStoreValues<FlatOrTree>;
    secretsManager?: DotSecPlainTextSecretsManagerValues<FlatOrTree>;
};
// export type DotSecEncryptedValues = DotSecValues<IsFlat, Encrypted>;

const f: DotSecPlainTextValues<IsTree> = {
    parameterStore: {
        nested: {
            username: {
                value: 'asd',
                type: 'SecureString',
            },
        },
    },
    secretsManager: {
        sss: 'asd',
        valxue: 'omg',
        mekker: {
            value: 'asd',
            description: 'some stuff',
            other: 'no',
        },
    },
};
