import { info } from 'console';

import {
    DecryptCommand,
    EncryptCommand,
    EncryptionAlgorithmSpec,
    KMSClient,
} from '@aws-sdk/client-kms';
import { PutParameterCommand } from '@aws-sdk/client-ssm';
import { Credentials } from '@aws-sdk/types';
import { bold, underline } from 'chalk';

import { getEncryptionAlgorithm, getKMSClient } from '../../utils/kms';
import {
    AWSValueType,
    AWSVariablesRequired,
    AWSEncryptedVariablesRequired,
    AWSEncryptedParameterStoreValues,
    AWSEncryptedSecretsManagerValues,
    AWSEncryptedParameterStoreValue,
    AWSParmaterStoreValueExpanded,
    AWSEncryptedSecretsManagerValue,
    AWSSecretsManagerValueExpanded,
    AWSParameterStoreValues,
    AWSSecretsManagerValues,
    AWSParameterStoreValue,
    AWSSecretsManagerValue,
    AWSStorageVariables,
    AWSSecretsManagerExports,
    AWSSecretsManagerExport,
    AWSParameterStoreExports,
    AWSParameterStoreExport,
} from '../aws/types';

export { getDotSecFile } from './files';
export {
    expandValues,
    expandEncryptedValues,
    collapseValues,
    collapseEncryptedValues,
} from './transform';

const waiter = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(true);
        }, 1);
    });
};

const encryptVariable = async (options: {
    variableName: string;
    variableValue: unknown;
    encryptionAlgorithm: EncryptionAlgorithmSpec | string;
    keyAlias: string;
    kmsClient: KMSClient;
    verbose?: boolean;
}) => {
    const {
        variableName,
        variableValue,
        encryptionAlgorithm,
        keyAlias,
        kmsClient,
        verbose,
    } = options;
    let parameterCopy = variableValue;
    // check if parameter is string, number or boolean, if not, encode to json
    if (
        typeof variableValue !== 'string' &&
        typeof variableValue !== 'number' &&
        typeof variableValue !== 'boolean'
    ) {
        parameterCopy = JSON.stringify(variableValue);
    }
    const encryptCommand = new EncryptCommand({
        KeyId: keyAlias,
        Plaintext: Buffer.from(String(parameterCopy)),
        EncryptionAlgorithm: encryptionAlgorithm,
    });

    const encryptionResult = await kmsClient.send(encryptCommand);

    if (!encryptionResult.CiphertextBlob) {
        throw new Error(
            `Something bad happened: ${JSON.stringify({
                key: variableName,
                value: variableValue,
                encryptCommand,
            })}`,
        );
    }

    if (verbose) {
        info(`Encrypting key ${bold(variableName)} ${underline('ok')}`);
    }

    const cipherText = Buffer.from(encryptionResult.CiphertextBlob).toString(
        'base64',
    );
    return [variableName, cipherText];
};

const decryptVariable = async (options: {
    variableName: string;
    encryptedVariableValue: string;
    encryptionAlgorithm: EncryptionAlgorithmSpec | string;
    keyAlias: string;
    kmsClient: KMSClient;
    verbose?: boolean;
}): Promise<[string, AWSValueType]> => {
    const {
        variableName,
        encryptedVariableValue,
        encryptionAlgorithm,
        keyAlias,
        kmsClient,
        verbose,
    } = options;
    // check if parameter is string, number or boolean, if not, encode to json

    const decryptCommand = new DecryptCommand({
        KeyId: keyAlias,
        CiphertextBlob: Buffer.from(encryptedVariableValue, 'base64'),
        EncryptionAlgorithm: encryptionAlgorithm,
    });

    const decryptionResult = await kmsClient.send(decryptCommand);

    if (!decryptionResult.Plaintext) {
        throw new Error(
            `Something bad happened: ${JSON.stringify({
                key: variableName,
                cipherText: encryptedVariableValue,
                decryptCommand: decryptCommand,
            })}`,
        );
    }

    if (verbose) {
        info(`Decrypting key ${bold(variableName)} ${underline('ok')}`);
    }

    const value = Buffer.from(decryptionResult.Plaintext).toString();
    try {
        // is this json?
        const jsonObject = JSON.parse(value) as Record<string, unknown>;
        return [variableName, jsonObject];
    } catch (e) {
        console.log('NOPES', value);
        // ignore it, yes, it is not json
    }

    return [variableName, value];
};

const awsValueToString = (stringOrObject: AWSValueType): string | undefined => {
    if (
        typeof stringOrObject === 'string' ||
        typeof stringOrObject === 'number' ||
        typeof stringOrObject === 'boolean'
    ) {
        return String(stringOrObject);
    }
    return JSON.stringify(stringOrObject);
};
export const encryptAWSVariables = async (options: {
    awsVariables: AWSVariablesRequired;
    credentials: Credentials;
    region: string;
    verbose?: boolean;
    keyAlias?: string;
}): Promise<AWSEncryptedVariablesRequired> => {
    const { awsVariables, credentials, region, verbose } = options;
    const kmsClient = getKMSClient({
        configuration: {
            credentials,
            region,
        },
        verbose,
    });

    const awsKeyAlias = options.keyAlias || awsVariables.config.aws.keyAlias;

    const encryptionAlgorithm = await getEncryptionAlgorithm(
        kmsClient,
        awsKeyAlias,
    );

    let encryptedParameterStoreValues:
        | AWSEncryptedParameterStoreValues
        | undefined;
    let encryptedSecretsManagerValues:
        | AWSEncryptedSecretsManagerValues
        | undefined;

    if (awsVariables.parameterStore) {
        encryptedParameterStoreValues = await Object.entries(
            awsVariables.parameterStore,
        ).reduce(
            async (
                awsEncryptedParameterStoreValuesPromise,
                [key, stringOrObject],
            ) => {
                await waiter();
                const awsEncryptedParameterStoreValues =
                    await awsEncryptedParameterStoreValuesPromise;
                if (
                    typeof stringOrObject === 'string' ||
                    typeof stringOrObject === 'number' ||
                    typeof stringOrObject === 'boolean' ||
                    !(
                        stringOrObject.hasOwnProperty('value') &&
                        ['type', 'onlyInRegions', 'andInRegions'].find(
                            (property) =>
                                stringOrObject.hasOwnProperty(property),
                        )
                    )
                ) {
                    const encryptionTarget = awsValueToString(stringOrObject);
                    if (encryptionTarget) {
                        const [, encryptedValue] = await encryptVariable({
                            variableName: key,
                            variableValue: encryptionTarget,
                            encryptionAlgorithm,
                            keyAlias: awsKeyAlias,
                            kmsClient,
                            verbose: verbose || false,
                        });
                        return {
                            ...awsEncryptedParameterStoreValues,
                            [key]: encryptedValue as AWSEncryptedParameterStoreValue,
                        };
                    }
                }

                const { value, ...rest } =
                    stringOrObject as AWSParmaterStoreValueExpanded;
                const encryptionTarget = awsValueToString(value);
                const [, encryptedValue] = await encryptVariable({
                    variableName: key,
                    variableValue: encryptionTarget,
                    encryptionAlgorithm,
                    keyAlias: awsKeyAlias,
                    kmsClient,
                    verbose: verbose || false,
                });
                return {
                    ...awsEncryptedParameterStoreValues,
                    [key]: {
                        ...rest,
                        encryptedValue,
                    } as AWSEncryptedParameterStoreValue,
                };
            },
            Promise.resolve({} as AWSEncryptedParameterStoreValues),
        );
    }
    if (awsVariables.secretsManager) {
        encryptedSecretsManagerValues = await Object.entries(
            awsVariables.secretsManager,
        ).reduce(
            async (
                awsEncryptedSecretsManagerValuesPromise,
                [key, stringOrObject],
            ) => {
                const awsEncryptedSecretsManagerValues =
                    await awsEncryptedSecretsManagerValuesPromise;

                if (
                    typeof stringOrObject === 'string' ||
                    typeof stringOrObject === 'number' ||
                    typeof stringOrObject === 'boolean' ||
                    !(
                        stringOrObject.hasOwnProperty('value') &&
                        ['type', 'onlyInRegions', 'andInRegions'].find(
                            (property) =>
                                stringOrObject.hasOwnProperty(property),
                        )
                    )
                ) {
                    const encryptionTarget = awsValueToString(stringOrObject);
                    const [, encryptedValue] = await encryptVariable({
                        variableName: key,
                        variableValue: encryptionTarget,
                        encryptionAlgorithm,
                        keyAlias: awsKeyAlias,
                        kmsClient,
                        verbose: verbose || false,
                    });
                    return {
                        ...awsEncryptedSecretsManagerValues,
                        [key]: encryptedValue as AWSEncryptedSecretsManagerValue,
                    } as AWSEncryptedSecretsManagerValues;
                }

                const { value, ...rest } =
                    stringOrObject as AWSSecretsManagerValueExpanded;
                const encryptionTarget = awsValueToString(value);
                const [, encryptedValue] = await encryptVariable({
                    variableName: key,
                    variableValue: encryptionTarget,
                    encryptionAlgorithm,
                    keyAlias: awsKeyAlias,
                    kmsClient,
                    verbose: verbose || false,
                });
                return {
                    ...awsEncryptedSecretsManagerValues,
                    [key]: {
                        ...rest,
                        encryptedValue: encryptedValue,
                    } as AWSEncryptedSecretsManagerValue,
                } as AWSEncryptedSecretsManagerValues;
            },
            Promise.resolve({} as AWSEncryptedSecretsManagerValues),
        );
    }

    return {
        config: awsVariables.config,
        parameterStore: encryptedParameterStoreValues,
        secretsManager: encryptedSecretsManagerValues,
    };
};
export const decryptAWSVariables = async (options: {
    awsEncryptedVariables: AWSEncryptedVariablesRequired;
    credentials: Credentials;
    region: string;
    verbose?: boolean;
    keyAlias?: string;
}): Promise<AWSVariablesRequired> => {
    const { awsEncryptedVariables, credentials, region, verbose } = options;
    const kmsClient = getKMSClient({
        configuration: {
            credentials,
            region,
        },
        verbose,
    });

    const awsKeyAlias =
        options.keyAlias || awsEncryptedVariables.config.aws.keyAlias;

    const encryptionAlgorithm = await getEncryptionAlgorithm(
        kmsClient,
        awsKeyAlias,
    );

    let parameterStoreValues: AWSParameterStoreValues | undefined;
    let secretsManagerValues: AWSSecretsManagerValues | undefined;

    if (awsEncryptedVariables.parameterStore) {
        parameterStoreValues = await Object.entries(
            awsEncryptedVariables.parameterStore,
        ).reduce(
            async (
                awsEncryptedParameterStoreValuesPromise,
                [key, stringOrObject],
            ) => {
                const awsEncryptedParameterStoreValues =
                    await awsEncryptedParameterStoreValuesPromise;
                if (
                    typeof stringOrObject === 'string' ||
                    !(
                        stringOrObject.hasOwnProperty('encryptedValue') &&
                        ['type', 'onlyInRegions', 'andInRegions'].find(
                            (property) =>
                                stringOrObject.hasOwnProperty(property),
                        )
                    )
                ) {
                    const [, decryptedValue] = await decryptVariable({
                        variableName: key,
                        encryptedVariableValue: stringOrObject as string,
                        encryptionAlgorithm,
                        keyAlias: awsKeyAlias,
                        kmsClient,
                        verbose: verbose || false,
                    });
                    return {
                        ...awsEncryptedParameterStoreValues,
                        [key]: decryptedValue as AWSParameterStoreValue,
                    };
                }

                const { encryptedValue, ...rest } = stringOrObject;
                const [, decryptedValue] = await decryptVariable({
                    variableName: key,
                    encryptedVariableValue: encryptedValue,
                    encryptionAlgorithm,
                    keyAlias: awsKeyAlias,
                    kmsClient,
                    verbose: verbose || false,
                });
                return {
                    ...awsEncryptedParameterStoreValues,
                    [key]: {
                        ...rest,
                        value: decryptedValue,
                    } as AWSParameterStoreValue,
                };
            },
            Promise.resolve({} as AWSParameterStoreValues),
        );
    }
    if (awsEncryptedVariables.secretsManager) {
        secretsManagerValues = await Object.entries(
            awsEncryptedVariables.secretsManager,
        ).reduce(
            async (
                awsEncryptedSecretsManagerValuesPromise,
                [key, stringOrObject],
            ) => {
                const awsEncryptedSecretsManagerValues =
                    await awsEncryptedSecretsManagerValuesPromise;

                if (
                    typeof stringOrObject === 'string' ||
                    !(
                        stringOrObject.hasOwnProperty('encryptedValue')
                        // &&
                        // ['type', 'onlyInRegions', 'andInRegions'].find(
                        //     (property) =>
                        //         stringOrObject.hasOwnProperty(property),
                        // )
                    )
                ) {
                    const [, decryptedValue] = await decryptVariable({
                        variableName: key,
                        encryptedVariableValue: stringOrObject as string,
                        encryptionAlgorithm,
                        keyAlias: awsKeyAlias,
                        kmsClient,
                        verbose: verbose || false,
                    });
                    return {
                        ...awsEncryptedSecretsManagerValues,
                        [key]: decryptedValue as AWSSecretsManagerValue,
                    } as AWSSecretsManagerValues;
                }

                const { encryptedValue, ...rest } = stringOrObject;
                const [, decryptedValue] = await decryptVariable({
                    variableName: key,
                    encryptedVariableValue: encryptedValue,
                    encryptionAlgorithm,
                    keyAlias: awsKeyAlias,
                    kmsClient,
                    verbose: verbose || false,
                });
                return {
                    ...awsEncryptedSecretsManagerValues,
                    [key]: {
                        ...rest,
                        value: decryptedValue,
                    } as AWSSecretsManagerValue,
                } as AWSSecretsManagerValues;
            },
            Promise.resolve({} as AWSEncryptedSecretsManagerValues),
        );
    }

    return {
        config: awsEncryptedVariables.config,
        parameterStore: parameterStoreValues,
        secretsManager: secretsManagerValues,
    };
};
export const getAWSStorageVariables = (
    awsVariables: AWSVariablesRequired,
): AWSStorageVariables => {
    const defaultRegions = awsVariables.config.aws.regions;

    const parseSecretsManagerTree = (
        internalSecrets: AWSSecretsManagerValues,
    ): AWSSecretsManagerExports => {
        return Object.entries(internalSecrets).reduce<
            AWSStorageVariables['secretsManagerExports']
        >((all, [key, secretsManagerValue]) => {
            if (
                typeof secretsManagerValue === 'string' ||
                typeof secretsManagerValue === 'number' ||
                typeof secretsManagerValue === 'boolean' ||
                !(
                    secretsManagerValue.hasOwnProperty('value') &&
                    ['type', 'onlyInRegions', 'andInRegions'].find((property) =>
                        secretsManagerValue.hasOwnProperty(property),
                    )
                )
            ) {
                const exportString = awsValueToString(secretsManagerValue);
                if (exportString) {
                    const secretsManagerExport: AWSSecretsManagerExport = {
                        path: key,
                        value: exportString,
                        secretsManagerValue,
                        regions: defaultRegions,
                    };
                    return [...all, secretsManagerExport];
                }
                return all;
            }

            const exportString = awsValueToString(
                // I suck at TS
                (secretsManagerValue as AWSSecretsManagerValueExpanded).value,
            );
            if (exportString) {
                // not a string, but an object with a value property
                let regions: Array<string> = [...defaultRegions];
                if (secretsManagerValue.andInRegions) {
                    regions = Array.from(
                        new Set([
                            ...defaultRegions,
                            ...(secretsManagerValue.andInRegions as Array<string>),
                        ]),
                    );
                } else if (secretsManagerValue.onlyInRegions) {
                    regions =
                        secretsManagerValue.onlyInRegions as Array<string>;
                }
                const exportValue: AWSSecretsManagerExport = {
                    path: key,
                    value: exportString,
                    secretsManagerValue,
                    regions,
                };
                return [...all, exportValue];
            }

            return all;
        }, []);
    };
    const shitByRegion: Record<string, Array<unknown>> = {};

    const parseAWSParameterStoreVariables = (
        parameterStoreValues: AWSParameterStoreValues,
    ): AWSParameterStoreExports => {
        return Object.entries(parameterStoreValues).reduce<
            AWSStorageVariables['parameterStoreExports']
        >((all, [key, parameterStoreValue]) => {
            if (
                typeof parameterStoreValue === 'string' ||
                typeof parameterStoreValue === 'number' ||
                typeof parameterStoreValue === 'boolean' ||
                !(
                    parameterStoreValue.hasOwnProperty('value') &&
                    ['type', 'onlyInRegions', 'andInRegions'].find((property) =>
                        parameterStoreValue.hasOwnProperty(property),
                    )
                )
            ) {
                const exportString = awsValueToString(parameterStoreValue);
                if (exportString) {
                    const putParameterCommand = new PutParameterCommand({
                        Name: `/${key}`,
                        Value: exportString,
                        Type: (
                            parameterStoreValue as AWSParmaterStoreValueExpanded
                        ).type,
                        Overwrite: true,
                    });

                    console.log('woopie1', putParameterCommand);

                    const parameterStoreExport: AWSParameterStoreExport = {
                        path: key,
                        value: exportString,
                        parameterStoreValue,
                        regions: defaultRegions,
                    };
                    return [...all, parameterStoreExport];
                }
                return all;
            }
            const exportString = awsValueToString(
                (parameterStoreValue as AWSParmaterStoreValueExpanded).value,
            );
            if (exportString) {
                // not a string, but an object with a value property
                let regions: Array<string> = [...defaultRegions];
                if ('andInRegions' in parameterStoreValue) {
                    regions = Array.from(
                        new Set([
                            ...defaultRegions,
                            ...(parameterStoreValue.andInRegions as Array<string>),
                        ]),
                    );
                } else if (parameterStoreValue.onlyInRegions) {
                    regions =
                        parameterStoreValue.onlyInRegions as Array<string>;
                }
                const putParameterCommand = new PutParameterCommand({
                    Name: `/${key}`,
                    Value: exportString,
                    Type: (parameterStoreValue as AWSParmaterStoreValueExpanded)
                        .type,
                    Overwrite: true,
                });

                console.log('woopie', putParameterCommand);

                const parameterStoreExport: AWSParameterStoreExport = {
                    path: key,
                    value: exportString,
                    parameterStoreValue,
                    regions,
                };

                return [...all, parameterStoreExport];
            }
            return all;
        }, []);
    };

    const secretsManagerExports = awsVariables.secretsManager
        ? parseSecretsManagerTree(awsVariables.secretsManager)
        : [];

    const parameterStoreExports = awsVariables.parameterStore
        ? parseAWSParameterStoreVariables(awsVariables.parameterStore)
        : [];
    return {
        secretsManagerExports,
        parameterStoreExports,
    };
};
