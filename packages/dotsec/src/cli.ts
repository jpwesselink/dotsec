/* eslint-disable @typescript-eslint/no-shadow */
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';

// import * as createAwsKey from './commands/createAwsKey';
import * as debugCommand from './commands/debugCommand';
import * as decryptSecCommand from './commands/decryptSecCommand';
import * as decryptSecretsJson from './commands/decryptSecretsJson';
import * as defaultCommmand from './commands/defaultCommand';
// import * as deleteAwsKey from './commands/deleteAwsKey';
import * as encryptEnvCommand from './commands/encryptEnvCommand';
import * as encryptSecretsJson from './commands/encryptSecretsJson';
import * as offloadToSSMCommand from './commands/offloadToSSMCommand';

void yargs(hideBin(process.argv))
    .command(defaultCommmand)
    .command(offloadToSSMCommand)
    .command(debugCommand)
    .command(encryptEnvCommand)
    .command(decryptSecCommand)
    .command(encryptSecretsJson)
    .command(decryptSecretsJson)
    // .command(createAwsKey)
    // .command(deleteAwsKey)
    .parse();
