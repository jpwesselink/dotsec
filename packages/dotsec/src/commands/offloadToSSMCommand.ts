import fs from 'node:fs';
import path from 'node:path';

import { DecryptCommand } from '@aws-sdk/client-kms';
import { PutParameterCommand } from '@aws-sdk/client-ssm';
import { redBright } from 'chalk';
import flat from 'flat';

import { commonCliOptions } from '../commonCliOptions';
import { handleCredentialsAndRegion } from '../lib/partial-commands/handleCredentialsAndRegion';
import { EncryptedSecrets, YargsHandlerParams } from '../types';
import { fileExists } from '../utils/io';
import { getEncryptionAlgorithm, getKMSClient } from '../utils/kms';
import { bold, getLogger, underline } from '../utils/logger';
import { getSSMClient } from '../utils/ssm';
export const command = 'offload-secrets-json-to-ssm';
export const desc =
    'Sends decrypted values of secrets.encrypted.json file to SSM parameter store';

export const builder = {
    'aws-profile': commonCliOptions.awsProfile,
    'aws-region': commonCliOptions.awsRegion,
    'aws-key-alias': commonCliOptions.awsKeyAlias,

    'encrypted-secrets-file': {
        string: true,
        describe: 'filename of json file for reading encrypted secrets',
        default: 'secrets.encrypted.json',
    },
    'assume-role-arn': commonCliOptions.awsAssumeRoleArn,
    verbose: commonCliOptions.verbose,
    yes: { ...commonCliOptions.yes },
} as const;

export const handler = async (
    argv: YargsHandlerParams<typeof builder>,
): Promise<void> => {
    const { info, error } = getLogger();
    try {
        const { credentialsAndOrigin, regionAndOrigin } =
            await handleCredentialsAndRegion({
                argv: { ...argv },
                env: { ...process.env },
            });

        const encryptedSecretsPath = path.resolve(
            process.cwd(),
            argv.encryptedSecretsFile,
        );
        if (!(await fileExists(encryptedSecretsPath))) {
            error(`Could not open ${redBright(encryptedSecretsPath)}`);
            return;
        }
        const encryptedSecrets = JSON.parse(
            fs.readFileSync(encryptedSecretsPath, { encoding: 'utf8' }),
        ) as EncryptedSecrets;

        if (!encryptedSecrets.encryptedParameters) {
            throw new Error(
                `Expected 'encryptedParameters' property, but got none`,
            );
        }

        const flatEncryptedParameters: Record<string, string> = flat(
            encryptedSecrets.encryptedParameters,
            { delimiter: '/' },
        );

        const kmsClient = getKMSClient({
            configuration: {
                credentials: credentialsAndOrigin.value,
                region: regionAndOrigin.value,
            },
            verbose: argv.verbose,
        });

        if (argv.verbose) {
            info(
                `Encrypting using key alias ${bold(argv.awsKeyAlias)} in ${bold(
                    await kmsClient.config.region(),
                )}`,
            );
        }

        const encryptionAlgorithm = await getEncryptionAlgorithm(
            kmsClient,
            argv.awsKeyAlias,
        );

        const flatParameters = Object.fromEntries(
            await Promise.all(
                Object.entries(flatEncryptedParameters).map(
                    async ([parameterName, encryptedParameter]) => {
                        const decryptCommand = new DecryptCommand({
                            KeyId: argv.awsKeyAlias,
                            CiphertextBlob: Buffer.from(
                                encryptedParameter,
                                'base64',
                            ),
                            EncryptionAlgorithm: encryptionAlgorithm,
                        });

                        const decryptionResult = await kmsClient.send(
                            decryptCommand,
                        );

                        if (!decryptionResult.Plaintext) {
                            throw new Error(
                                `Something bad happened: ${JSON.stringify({
                                    key: parameterName,
                                    cipherText: encryptedParameter,
                                    decryptCommand: decryptCommand,
                                })}`,
                            );
                        }

                        if (argv.verbose) {
                            info(
                                `Encrypting key ${bold(
                                    parameterName,
                                )} ${underline('ok')}`,
                            );
                        }

                        const value = Buffer.from(
                            decryptionResult.Plaintext,
                        ).toString();
                        return [parameterName, value];
                    },
                ),
            ),
        ) as Record<string, string>;

        // create ssm client

        const ssmClient = getSSMClient({
            configuration: {
                credentials: credentialsAndOrigin.value,
                region: regionAndOrigin.value,
            },
            verbose: argv.verbose,
        });

        await Promise.all(
            Object.entries(flatParameters).map(([parameterName, value]) => {
                const putParameterCommand = new PutParameterCommand({
                    Name: `/${parameterName}`,
                    Value: value,
                    Type: 'String',
                    Overwrite: true,
                });

                return ssmClient.send(putParameterCommand);
            }),
        );
    } catch (e) {
        error(e);
    }
};
