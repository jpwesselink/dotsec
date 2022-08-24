import fs from 'node:fs';
import path from 'node:path';

import { DescribeKeyCommand, EncryptCommand } from '@aws-sdk/client-kms';
import { redBright } from 'chalk';
import { parse } from 'dotenv';

import { commonCliOptions } from '../commonCliOptions';
import { handleCredentialsAndRegion } from '../lib/partial-commands/handleCredentialsAndRegion';
import { YargsHandlerParams } from '../types';
import { fileExists } from '../utils/io';
import { getEncryptionAlgorithm, getKMSClient } from '../utils/kms';
import { bold, getLogger, underline } from '../utils/logger';
export const command = 'encrypt-env';
export const desc = 'Encrypts a dotenv file';

export const builder = {
    'aws-profile': commonCliOptions.awsProfile,
    'aws-region': commonCliOptions.awsRegion,
    'aws-key-alias': commonCliOptions.awsKeyAlias,
    'env-file': { ...commonCliOptions.envFile, default: '.env' },
    'sec-file': commonCliOptions.secFile,
    'assume-role-arn': commonCliOptions.awsAssumeRoleArn,
    verbose: commonCliOptions.verbose,
    // yes: { ...commonCliOptions.yes },
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

        const envSource = path.resolve(process.cwd(), argv.envFile);
        if (!(await fileExists(envSource))) {
            error(`Could not open ${redBright(envSource)}`);
            return;
        }
        const parsedEnv = parse(
            fs.readFileSync(envSource, { encoding: 'utf8' }),
        );

        const kmsClient = getKMSClient({
            configuration: {
                credentials: credentialsAndOrigin.value,
                region: regionAndOrigin.value,
            },
            verbose: argv.verbose,
        });

        const encryptionAlgorithm = await getEncryptionAlgorithm(
            kmsClient,
            argv.awsKeyAlias,
        );

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

        const sec = (
            await Promise.all(
                Object.entries(parsedEnv).map(async ([key, value]) => {
                    const encryptCommand = new EncryptCommand({
                        KeyId: argv.awsKeyAlias,
                        Plaintext: Buffer.from(value),
                        EncryptionAlgorithm: encryptionAlgorithm,
                    });

                    const encryptionResult = await kmsClient.send(
                        encryptCommand,
                    );

                    if (!encryptionResult.CiphertextBlob) {
                        throw new Error(
                            `Something bad happened: ${JSON.stringify({
                                key,
                                value,
                                encryptCommand,
                            })}`,
                        );
                    }

                    if (argv.verbose) {
                        info(`Encrypting key ${bold(key)} ${underline('ok')}`);
                    }

                    const cipherText = Buffer.from(
                        encryptionResult.CiphertextBlob,
                    ).toString('base64');
                    return `${key}="${cipherText}"`;
                }),
            )
        ).join('\n');

        fs.writeFileSync(path.resolve(process.cwd(), argv.secFile), sec);
    } catch (e) {
        error(e);
    }
};
