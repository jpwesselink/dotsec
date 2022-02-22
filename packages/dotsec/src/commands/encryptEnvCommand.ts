import { KMSClient, EncryptCommand } from '@aws-sdk/client-kms';
import { redBright } from 'chalk';
import { parse } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

import { commonCliOptions } from '../commonCliOptions';
import { handleCredentialsAndRegion } from '../lib/partial-commands/handleCredentialsAndRegion';
import { YargsHandlerParams } from '../types';
import { fileExists } from '../utils/io';

export const command = 'encrypt-env';
export const desc = 'Encrypts a dotenv file';

export const builder = {
    'aws-profile': {
        ...commonCliOptions.awsProfile,
    },
    'aws-region': {
        ...commonCliOptions.awsRegion,
    },
    'aws-key-alias': { string: true, default: 'alias/top-secret' },
    'env-file': {
        string: true,
        describe: '.env file',
        default: '.env',
    },
    'sec-file': {
        string: true,
        describe: '.sec file',
        default: '.sec',
    },
    verbose: { ...commonCliOptions.verbose },
    yes: { ...commonCliOptions.yes },
} as const;

export const handler = async (argv: YargsHandlerParams<typeof builder>): Promise<void> => {
    try {
        const { credentialsAndOrigin, regionAndOrigin } = await handleCredentialsAndRegion({ argv: { ...argv }, env: { ...process.env } });

        const envSource = path.resolve(process.cwd(), argv.envFile);
        if (!(await fileExists(envSource))) {
            console.error(`Could not open ${redBright(envSource)}`);
            return;
        }
        const parsedEnv = parse(fs.readFileSync(envSource, { encoding: 'utf8' }));

        const kmsClient = new KMSClient({
            credentials: credentialsAndOrigin.value,
            region: regionAndOrigin.value,
        });

        const sec = (
            await Promise.all(
                Object.entries(parsedEnv).map(async ([key, value]) => {
                    const encryptCommand = new EncryptCommand({
                        KeyId: argv.awsKeyAlias,
                        Plaintext: Buffer.from(value),
                        EncryptionAlgorithm: 'RSAES_OAEP_SHA_256',
                    });
                    const encryptionResult = await kmsClient.send(encryptCommand);

                    if (!encryptionResult.CiphertextBlob) {
                        throw new Error(`No: ${JSON.stringify({ key, value, encryptCommand })}`);
                    }

                    const cipherText = Buffer.from(encryptionResult.CiphertextBlob).toString('base64');
                    return `${key}="${cipherText}"`;
                }),
            )
        ).join('\n');

        // console.log(sec);

        fs.writeFileSync(path.resolve(process.cwd(), argv.secFile), sec);
    } catch (e) {
        console.error(e);
    }
};
