import fs from 'node:fs';
import path from 'node:path';

import { KMSClient, DecryptCommand } from '@aws-sdk/client-kms';
import { redBright } from 'chalk';
import { spawn } from 'cross-spawn';
import { parse } from 'dotenv';

import { commonCliOptions } from '../commonCliOptions';
import { handleCredentialsAndRegion } from '../lib/partial-commands/handleCredentialsAndRegion';
import {
    CredentialsAndOrigin,
    RegionAndOrigin,
    YargsHandlerParams,
} from '../types';
import { fileExists } from '../utils/io';

export const command = '$0 <command>';
export const desc =
    'Decrypts a .sec file, injects the results into a separate process and runs a command';

export const builder = {
    'aws-profile': commonCliOptions.awsProfile,
    'aws-region': commonCliOptions.awsRegion,
    'aws-key-alias': commonCliOptions.awsKeyAlias,
    'sec-file': commonCliOptions.secFile,
    'env-file': commonCliOptions.envFile,
    'aws-assume-role-arn': commonCliOptions.awsAssumeRoleArn,
    verbose: commonCliOptions.verbose,
    // yes: { ...commonCliOptions.yes },
    command: { string: true, required: true },
} as const;

const handleSec = async ({
    secFile,
    credentialsAndOrigin,
    regionAndOrigin,
    awsKeyAlias,
}: {
    secFile: string;
    credentialsAndOrigin: CredentialsAndOrigin;
    regionAndOrigin: RegionAndOrigin;
    awsKeyAlias: string;
}) => {
    const secSource = path.resolve(process.cwd(), secFile);
    if (!(await fileExists(secSource))) {
        console.error(`Could not open ${redBright(secSource)}`);
        return;
    }
    const parsedSec = parse(fs.readFileSync(secSource, { encoding: 'utf8' }));

    const kmsClient = new KMSClient({
        credentials: credentialsAndOrigin.value,
        region: regionAndOrigin.value,
    });

    const envEntries: [string, string][] = await Promise.all(
        Object.entries(parsedSec).map(async ([key, cipherText]) => {
            const decryptCommand = new DecryptCommand({
                KeyId: awsKeyAlias,
                CiphertextBlob: Buffer.from(cipherText, 'base64'),
                EncryptionAlgorithm: 'RSAES_OAEP_SHA_256',
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
            const value = Buffer.from(decryptionResult.Plaintext).toString();
            return [key, value];
        }),
    );
    const env = Object.fromEntries(envEntries);

    return env;
};
export const handler = async (
    argv: YargsHandlerParams<typeof builder>,
): Promise<void> => {
    try {
        let env: Record<string, string> | undefined;
        if (argv.envFile) {
            env = parse(fs.readFileSync(argv.envFile, { encoding: 'utf8' }));
        }

        let awsEnv: Record<string, string> | undefined;

        const { credentialsAndOrigin, regionAndOrigin } =
            await handleCredentialsAndRegion({
                argv: { ...argv },
                env: {
                    ...process.env,
                    AWS_ASSUME_ROLE_ARN:
                        process.env.AWS_ASSUME_ROLE_ARN ||
                        env?.AWS_ASSUME_ROLE_ARN,
                },
            });

        if (
            (argv.awsAssumeRoleArn ||
                process.env.AWS_ASSUME_ROLE_ARN ||
                env?.AWS_ASSUME_ROLE_ARN) &&
            credentialsAndOrigin.value.sessionToken !== undefined
        ) {
            awsEnv = {
                AWS_ACCESS_KEY_ID: credentialsAndOrigin.value.accessKeyId,
                AWS_SECRET_ACCESS_KEY:
                    credentialsAndOrigin.value.secretAccessKey,
                AWS_SESSION_TOKEN: credentialsAndOrigin.value.sessionToken,
            };
            // this means we have
        }
        if (argv.verbose) {
            console.log({ credentialsAndOrigin, regionAndOrigin });
        }

        if (!argv.envFile && argv.secFile) {
            env = await handleSec({
                secFile: argv.secFile,
                credentialsAndOrigin,
                regionAndOrigin,
                awsKeyAlias: argv.awsKeyAlias,
            });
        }

        // const secSource = path.resolve(process.cwd(), argv.secFile);
        // if (!(await fileExists(secSource))) {
        //     console.error(`Could not open ${redBright(secSource)}`);
        //     return;
        // }
        // const parsedSec = parse(
        //     fs.readFileSync(secSource, { encoding: 'utf8' }),
        // );

        // const kmsClient = new KMSClient({
        //     credentials: credentialsAndOrigin.value,
        //     region: regionAndOrigin.value,
        // });

        // const envEntries: [string, string][] = await Promise.all(
        //     Object.entries(parsedSec).map(async ([key, cipherText]) => {
        //         const decryptCommand = new DecryptCommand({
        //             KeyId: argv.awsKeyAlias,
        //             CiphertextBlob: Buffer.from(cipherText, 'base64'),
        //             EncryptionAlgorithm: 'RSAES_OAEP_SHA_256',
        //         });
        //         const decryptionResult = await kmsClient.send(decryptCommand);

        //         if (!decryptionResult?.Plaintext) {
        //             throw new Error(
        //                 `No: ${JSON.stringify({
        //                     key,
        //                     cipherText,
        //                     decryptCommand,
        //                 })}`,
        //             );
        //         }
        //         const value = Buffer.from(
        //             decryptionResult.Plaintext,
        //         ).toString();
        //         return [key, value];
        //     }),
        // );
        // const env = Object.fromEntries(envEntries);

        //
        const userCommandArgs = process.argv.slice(
            process.argv.indexOf(argv.command) + 1,
        );

        if (argv.command) {
            spawn(argv.command, [...userCommandArgs], {
                stdio: 'inherit',
                shell: false,
                env: { ...process.env, ...awsEnv, ...env },
            });
        }
    } catch (e) {
        console.error(e);
    }
};
