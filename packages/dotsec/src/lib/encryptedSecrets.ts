import fs from 'fs';
import path from 'path';

import { redBright } from 'chalk';

import { EncryptedSecrets } from '../types';
import { fileExists } from '../utils/io';

export const loadEncryptedSecrets = async ({
    encryptedSecretsFile,
}: {
    encryptedSecretsFile: string;
}) => {
    const encryptedSecretsPath = path.resolve(
        process.cwd(),
        encryptedSecretsFile,
    );
    if (!(await fileExists(encryptedSecretsPath))) {
        throw new Error(`Could not open ${redBright(encryptedSecretsPath)}`);
    }
    const encryptedSecrets = JSON.parse(
        fs.readFileSync(encryptedSecretsPath, { encoding: 'utf8' }),
    ) as EncryptedSecrets;
    if (!encryptedSecrets) {
        throw new Error(
            `No encrypted secrets found in ${redBright(encryptedSecretsPath)}`,
        );
    }
    if (!encryptedSecrets.encryptedParameters) {
        throw new Error(
            `Expected 'encryptedParameters' property, but got none`,
        );
    }

    return encryptedSecrets;
};
