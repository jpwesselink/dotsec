import { DecryptCommand, DescribeKeyCommand } from '@aws-sdk/client-kms';
import { redBright } from 'chalk';
import flat from 'flat';
import fs from 'node:fs';
import path from 'node:path';

import { commonCliOptions } from '../commonCliOptions';
import { handleCredentialsAndRegion } from '../lib/partial-commands/handleCredentialsAndRegion';
import { EncryptedSecrets, Secrets, YargsHandlerParams } from '../types';
import { fileExists, promptOverwriteIfFileExists } from '../utils/io';
import { getKMSClient } from '../utils/kms';
import { bold, getLogger, underline } from '../utils/logger';
export const command = 'decrypt-secrets-json';
export const desc = 'Derypts an encrypted file';

export const builder = {
    'aws-profile': commonCliOptions.awsProfile,
    'aws-region': commonCliOptions.awsRegion,
    'aws-key-alias': commonCliOptions.awsKeyAlias,
    'secrets-file': {
        string: true,
        describe: 'filename of json file writing secrets',
        default: 'secrets.json',
    },
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

            // describe key *once*

            const describeKeyCommand = new DescribeKeyCommand({
                KeyId: argv.awsKeyAlias,
            });

            const describeKeyResult = await kmsClient.send(describeKeyCommand);

            console.log('describeKeyResult', { describeKeyResult });
        }

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
                            EncryptionAlgorithm: 'RSAES_OAEP_SHA_256',
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

        const parameters: Secrets['parameters'] = flat.unflatten(
            flatParameters,
            { delimiter: '/' },
        );
        const secrets: Secrets = {
            config: encryptedSecrets.config,
            parameters,
        };
        const secretsPath = path.resolve(process.cwd(), argv.secretsFile);
        const overwriteResponse = await promptOverwriteIfFileExists({
            filePath: secretsPath,
            skip: argv.yes,
        });

        if (
            overwriteResponse === undefined ||
            overwriteResponse.overwrite === true
        ) {
            fs.writeFileSync(secretsPath, JSON.stringify(secrets, null, 4));
        }
    } catch (e) {
        error(e);
    }
};
