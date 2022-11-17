import { constantCase } from 'constant-case';

import { getLogger, strong } from '../../utils/logger';
import { flattenTree } from './flat';
import {
    DotSecEncrypted,
    DotSecEncryptedEncoding,
    DotSecExpandedTree,
    DotSecTree,
    isEncryptedRegularParameter,
    isEncryptedSSMParameter,
    isSecretsManagerParameter,
} from './types';

const fromEncryptedLeafsToEnvEntries = (
    leafs: DotSecTree<'encrypted', 'flattened'>,
) => {
    return Object.entries(leafs).map(([key, plainTextValue]) => {
        const parts = key.split('/');

        const dotEnvKeyPath = parts.map((k) => constantCase(k)).join('_');

        let storageValue: string;
        if (isEncryptedRegularParameter(plainTextValue)) {
            storageValue = plainTextValue.encryptedValue;
        } else if (isEncryptedSSMParameter(plainTextValue)) {
            storageValue = plainTextValue.encryptedValue;
        } else if (isSecretsManagerParameter(plainTextValue)) {
            storageValue = plainTextValue.encryptedValue;
        } else {
            throw new Error('Invalid parameter type');
        }

        return `${dotEnvKeyPath}=${String(storageValue)}`;
    });
};

export const toDotSec = (options: {
    dotSecEncrypted: DotSecEncrypted;
    verbose?: boolean;
    searchPath?: string;
}) => {
    const { info } = getLogger();
    const { dotSecEncrypted, searchPath, verbose } = options;

    let tree = dotSecEncrypted.encrypted;
    if (searchPath) {
        if (verbose) {
            info(`Searching for path: ${strong(searchPath)}`);
        }
        const pathParts = searchPath.split('/');
        for (const pathPart of pathParts) {
            // questionable cast
            tree = tree[pathPart] as DotSecTree<
                DotSecEncryptedEncoding,
                DotSecExpandedTree
            >;
        }
    }

    const flattenedTree = flattenTree(tree);

    return fromEncryptedLeafsToEnvEntries(flattenedTree).join('\n');
};

export const toDotSecPerEnvironment = (options: {
    dotSecEncrypted: DotSecEncrypted;
    verbose?: boolean;
    searchPath?: string;
}) => {
    const { info } = getLogger();

    const { dotSecEncrypted, searchPath, verbose } = options;

    const environments = Object.keys(dotSecEncrypted.encrypted);

    return Object.fromEntries(
        environments.map((environment) => {
            let tree = dotSecEncrypted.encrypted[environment];
            if (searchPath) {
                if (verbose) {
                    info(`Searching for path: ${strong(searchPath)}`);
                }
                const pathParts = searchPath.split('/');
                for (const pathPart of pathParts) {
                    // questionable cast
                    tree = tree[pathPart] as DotSecTree<
                        DotSecEncryptedEncoding,
                        DotSecExpandedTree
                    >;
                }
            }

            return [
                environment,
                fromEncryptedLeafsToEnvEntries(flattenTree(tree)).join('\n'),
            ];
        }),
    );
};
