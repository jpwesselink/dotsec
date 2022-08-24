import fs from 'node:fs';
import path from 'node:path';

import { KMSClient, DecryptCommand } from '@aws-sdk/client-kms';
import { redBright } from 'chalk';
import { parse } from 'dotenv';

import { commonCliOptions } from '../commonCliOptions';
import { handleCredentialsAndRegion } from '../lib/partial-commands/handleCredentialsAndRegion';
import { YargsHandlerParams } from '../types';
import { fileExists } from '../utils/io';
import { getEncryptionAlgorithm } from '../utils/kms';

export const command = 'decrypt-sec';
export const desc = 'Decrypts a dotsec file';

export const builder = {
    'aws-profile': commonCliOptions.awsProfile,
    'aws-region': commonCliOptions.awsRegion,
    'aws-key-alias': commonCliOptions.awsKeyAlias,
    'assume-role-arn': commonCliOptions.awsAssumeRoleArn,
    'env-file': { ...commonCliOptions.envFile, default: 'env' },
    'sec-file': commonCliOptions.secFile,
    verbose: commonCliOptions.verbose,
    // yes: { ...commonCliOptions.yes },
} as const;

export const handler = async (
    argv: YargsHandlerParams<typeof builder>,
): Promise<void> => {
    try {
        const { credentialsAndOrigin, regionAndOrigin } =
            await handleCredentialsAndRegion({
                argv: { ...argv },
                env: { ...process.env },
            });

        const secSource = path.resolve(process.cwd(), argv.secFile);
        if (!(await fileExists(secSource))) {
            console.error(`Could not open ${redBright(secSource)}`);
            return;
        }
        const parsedSec = parse(
            fs.readFileSync(secSource, { encoding: 'utf8' }),
        );

        const kmsClient = new KMSClient({
            credentials: credentialsAndOrigin.value,
            region: regionAndOrigin.value,
        });

        const encryptionAlgorithm = await getEncryptionAlgorithm(
            kmsClient,
            argv.awsKeyAlias,
        );

        const envEntries: [string, string][] = await Promise.all(
            Object.entries(parsedSec).map(async ([key, cipherText]) => {
                const decryptCommand = new DecryptCommand({
                    KeyId: argv.awsKeyAlias,
                    CiphertextBlob: Buffer.from(cipherText, 'base64'),
                    EncryptionAlgorithm: encryptionAlgorithm,
                });
                const decryptionResult = await kmsClient.send(decryptCommand);

                if (!decryptionResult?.Plaintext) {
                    throw new Error(
                        `No: ${JSON.stringify({
                            key,
                            cipherText,
                            decryptCommand,
                        })}`,
                    );
                }
                const value = Buffer.from(
                    decryptionResult.Plaintext,
                ).toString();
                return [key, value];
            }),
        );
        fs.writeFileSync(
            path.resolve(process.cwd(), argv.envFile || '.env'),
            envEntries.map(([key, value]) => `${key}="${value}"`).join('\n'),
        );
    } catch (e) {
        console.error(e);
    }
};
