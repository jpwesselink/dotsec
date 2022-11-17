/* eslint-disable @typescript-eslint/no-shadow */
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';

// import * as createAwsKey from './commands/createAwsKey';
// import * as awsDecrypt from './commands/aws-decrypt';
// import * as awsEncrypt from './commands/aws-encrypt';
// import * as awsPush from './commands/aws-push';
// import * as debugCommand from './commands/debugCommand';
// import * as decryptSecCommand from './commands/decryptSecCommand';
// import * as decryptSecretsJson from './commands/decryptSecretsJson';
import convertCommand from './commands/convert';
import * as defaultCommmand from './commands/defaultCommand';
// import * as deleteAwsKey from './commands/deleteAwsKey';
import * as dotSecToDotEnv from './commands/dot-sec-to-dot-env';
import * as encryptedSecretsToDotEnv from './commands/encrypted-secrets-to-dot-env';
import * as encryptedSecretsToDotSec from './commands/encrypted-secrets-to-dot-sec';
import * as encryptedSecretsToPlaintextSecrets from './commands/encrypted-secrets-to-plaintext-secrets';
// import * as encryptEnvCommand from './commands/encryptEnvCommand';
// import * as encryptSecretsJson from './commands/encryptSecretsJson';
// import * as offloadToSSMCommand from './commands/offloadToSSMCommand';
import * as offloadPlaintextSecrets from './commands/offload-plaintext-secrets';
import * as plaintextSecretsToDotEnv from './commands/plaintext-secrets-to-dot-env';
import * as plaintextSecretsToDotSec from './commands/plaintext-secrets-to-dot-sec';
import * as plaintextSecretsToEncryptedSecrets from './commands/plaintext-secrets-to-encrypted-secrets';

void yargs(hideBin(process.argv))
    .command(convertCommand)
    .command(defaultCommmand)
    .command(plaintextSecretsToEncryptedSecrets)
    .command(encryptedSecretsToPlaintextSecrets)
    .command(encryptedSecretsToDotEnv)
    .command(encryptedSecretsToDotSec)
    .command(plaintextSecretsToDotEnv)
    .command(plaintextSecretsToDotSec)
    .command(dotSecToDotEnv)
    .command(offloadPlaintextSecrets)

    // .command(awsEncrypt)
    // .command(awsDecrypt)
    // .command(awsPush)
    // .command(offloadToSSMCommand)
    // .command(debugCommand)
    // .command(encryptEnvCommand)
    // .command(decryptSecCommand)
    // .command(encryptSecretsJson)
    // .command(decryptSecretsJson)
    // .command(createAwsKey)
    // .command(deleteAwsKey)
    .parse();
