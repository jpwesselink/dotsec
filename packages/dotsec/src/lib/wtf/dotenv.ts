import { constantCase } from 'constant-case';

import { getLogger, strong } from '../../utils/logger';
import { flattenTree } from './flat';
import {
    DotSecExpandedTree,
    DotSecPlainText,
    DotSecPlaintextEncoding,
    DotSecTree,
    DotSecValue,
    isBoolean,
    isNumber,
    isRegularParameter,
    isRegularParameterObject,
    isSecretsManagerParameter,
    isSSMParameter,
    isString,
} from './types';

const fromPlainTextLeafsToEnvEntries = (
    leafs: DotSecTree<'plaintext', 'flattened'>,
) => {
    return Object.entries(leafs).map(([key, plainTextValue]) => {
        const parts = key.split('/');

        const dotEnvKeyPath = parts.map((k) => constantCase(k)).join('_');

        let storageValue: DotSecValue;
        if (isRegularParameter(plainTextValue)) {
            if (isRegularParameterObject(plainTextValue)) {
                storageValue = plainTextValue.value;
            } else {
                storageValue = plainTextValue;
            }
        } else if (isSSMParameter(plainTextValue)) {
            storageValue = plainTextValue.value;
        } else if (isSecretsManagerParameter(plainTextValue)) {
            storageValue = plainTextValue.value;
        } else {
            throw new Error('Invalid parameter type');
        }
        // check if parameter is string, number or boolean, if not, encode to json
        if (
            !isString(storageValue) &&
            !isNumber(storageValue) &&
            !isBoolean(storageValue)
        ) {
            storageValue = JSON.stringify(storageValue);
        }

        return `${dotEnvKeyPath}=${String(storageValue)}`;
    });
};

export const toDotEnv = (options: {
    dotSecPlainText: DotSecPlainText;
    verbose?: boolean;
    searchPath?: string;
}) => {
    const { info } = getLogger();
    const { dotSecPlainText, searchPath, verbose } = options;
    let tree = dotSecPlainText.plaintext;
    if (searchPath) {
        if (verbose) {
            info(`Searching for path: ${strong(searchPath)}`);
        }
        const pathParts = searchPath.split('/');
        for (const pathPart of pathParts) {
            // questionable cast
            tree = tree[pathPart] as DotSecTree<
                DotSecPlaintextEncoding,
                DotSecExpandedTree
            >;

            if (tree === undefined) {
                throw new Error(
                    `Invalid search path: '${searchPath}', part: '${pathPart}' could not be found`,
                );
            }
        }
    }

    const flattenedTree = flattenTree(tree);

    return fromPlainTextLeafsToEnvEntries(flattenedTree).join('\n');
};

export const toDotEnvPerEnvironment = (options: {
    dotSecPlainText: DotSecPlainText;
    verbose?: boolean;
    searchPath?: string;
}) => {
    const { info } = getLogger();
    const { dotSecPlainText, searchPath, verbose } = options;

    const environments = Object.keys(dotSecPlainText.plaintext);

    return Object.fromEntries(
        environments.map((environment) => {
            let tree = dotSecPlainText.plaintext[environment];
            if (searchPath) {
                if (verbose) {
                    info(`Searching for path: ${strong(searchPath)}`);
                }
                const pathParts = searchPath.split('/');
                for (const pathPart of pathParts) {
                    // questionable cast
                    tree = tree[pathPart] as DotSecTree<
                        DotSecPlaintextEncoding,
                        DotSecExpandedTree
                    >;

                    if (tree === undefined) {
                        throw new Error(
                            `Invalid search path: '${searchPath}', part: '${pathPart}' could not be found`,
                        );
                    }
                }
            }
            return [
                environment,
                fromPlainTextLeafsToEnvEntries(flattenTree(tree)).join('\n'),
            ];
        }),
    );
};
