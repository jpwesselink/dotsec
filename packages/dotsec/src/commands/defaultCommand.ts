import { KMSClient, DecryptCommand } from '@aws-sdk/client-kms';
import { redBright } from 'chalk';
import { spawn } from 'cross-spawn';
import { parse } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

import { commonCliOptions } from '../commonCliOptions';
import { handleCredentialsAndRegion } from '../lib/partial-commands/handleCredentialsAndRegion';
import { YargsHandlerParams } from '../types';
import { fileExists } from '../utils/io';

export const command = '$0 <command>';
export const desc = 'Decrypts a .sec file, injects the results into a separate process and runs a command';

export const builder = {
    'aws-profile': {
        ...commonCliOptions.awsProfile,
    },
    'aws-region': {
        ...commonCliOptions.awsRegion,
    },
    'aws-key-alias': { string: true, default: 'alias/top-secret' },
    'sec-file': {
        string: true,
        describe: '.sec file',
        default: '.sec',
    },
    verbose: { ...commonCliOptions.verbose },
    yes: { ...commonCliOptions.yes },
    command: { string: true, required: true },
} as const;

export const handler = async (argv: YargsHandlerParams<typeof builder>): Promise<void> => {
    try {
        const { credentialsAndOrigin, regionAndOrigin } = await handleCredentialsAndRegion({ argv: { ...argv }, env: { ...process.env } });

        const secSource = path.resolve(process.cwd(), argv.secFile);
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
                    KeyId: argv.awsKeyAlias,
                    CiphertextBlob: Buffer.from(cipherText, 'base64'),
                    EncryptionAlgorithm: 'RSAES_OAEP_SHA_256',
                });
                const decryptionResult = await kmsClient.send(decryptCommand);

                if (!decryptionResult?.Plaintext) {
                    throw new Error(`No: ${JSON.stringify({ key, cipherText, decryptCommand })}`);
                }
                const value = Buffer.from(decryptionResult.Plaintext).toString();
                return [key, value];
            }),
        );
        const env = Object.fromEntries(envEntries);
        // console.log(env);

        const userCommandArgs = process.argv.slice(process.argv.indexOf(argv.command) + 1);
        // console.info({ userCommandArgs });

        // console.info(argv.command);
        if (argv.command) {
            spawn(argv.command, [...userCommandArgs], {
                stdio: 'inherit',
                shell: false,
                env: { ...process.env, ...env },
            });
        }
    } catch (e) {
        console.error(e);
    }
};
