import fs from 'node:fs';
import path from 'node:path';

import { DescribeKeyCommand, EncryptCommand } from '@aws-sdk/client-kms';
import { redBright } from 'chalk';
import flat from 'flat';

import { commonCliOptions } from '../commonCliOptions';
import { handleCredentialsAndRegion } from '../lib/partial-commands/handleCredentialsAndRegion';
import { EncryptedSecrets, Secrets, YargsHandlerParams } from '../types';
import { fileExists, promptOverwriteIfFileExists } from '../utils/io';
import { getKMSClient } from '../utils/kms';
import { bold, getLogger, underline } from '../utils/logger';
export const command = 'encrypt-secrets-json';
export const desc = 'Encrypts an unencrypted file';

export const builder = {
    'aws-profile': commonCliOptions.awsProfile,
    'aws-region': commonCliOptions.awsRegion,
    'aws-key-alias': commonCliOptions.awsKeyAlias,
    'secrets-file': {
        string: true,
        describe: 'filename of json file reading secrets',
        default: 'secrets.json',
    },
    'encrypted-secrets-file': {
        string: true,
        describe: 'filename of json file for writing encrypted secrets',
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

        const secretsPath = path.resolve(process.cwd(), argv.secretsFile);
        if (!(await fileExists(secretsPath))) {
            error(`Could not open ${redBright(secretsPath)}`);
            return;
        }
        const secrets = JSON.parse(
            fs.readFileSync(secretsPath, { encoding: 'utf8' }),
        ) as Secrets;

        if (!secrets.parameters) {
            throw new Error(`Expected 'parameters' property, but got none`);
        }

        const flatParameters: Record<string, string> = flat(
            secrets.parameters,
            { delimiter: '/' },
        );
        if (argv.verbose) {
            console.log(flatParameters);
        }
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

        const encryptedFlatParameters = Object.fromEntries(
            await Promise.all(
                Object.entries(flatParameters).map(
                    async ([parameterName, parameter]) => {
                        const encryptCommand = new EncryptCommand({
                            KeyId: argv.awsKeyAlias,
                            Plaintext: Buffer.from(parameter),
                            EncryptionAlgorithm: 'RSAES_OAEP_SHA_256',
                        });

                        const encryptionResult = await kmsClient.send(
                            encryptCommand,
                        );

                        if (!encryptionResult.CiphertextBlob) {
                            throw new Error(
                                `Something bad happened: ${JSON.stringify({
                                    key: parameterName,
                                    value: parameter,
                                    encryptCommand,
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

                        const cipherText = Buffer.from(
                            encryptionResult.CiphertextBlob,
                        ).toString('base64');
                        return [parameterName, cipherText];
                    },
                ),
            ),
        ) as Record<string, string>;

        const encryptedParameters: EncryptedSecrets['encryptedParameters'] =
            flat.unflatten(encryptedFlatParameters, { delimiter: '/' });
        const encryptedSecrets: EncryptedSecrets = {
            config: secrets.config,
            encryptedParameters,
        };

        const encryptedSecretsPath = path.resolve(
            process.cwd(),
            argv.encryptedSecretsFile,
        );
        const overwriteResponse = await promptOverwriteIfFileExists({
            filePath: encryptedSecretsPath,
            skip: argv.yes,
        });

        if (
            overwriteResponse === undefined ||
            overwriteResponse.overwrite === true
        ) {
            fs.writeFileSync(
                encryptedSecretsPath,
                JSON.stringify(encryptedSecrets, null, 4),
            );
        }
    } catch (e) {
        error(e);
    }
};
