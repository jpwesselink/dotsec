/* eslint-disable @typescript-eslint/no-shadow */
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';

// import * as createAwsKey from './commands/createAwsKey';
import * as decryptSecCommand from './commands/decryptSecCommand';
import * as defaultCommmand from './commands/defaultCommand';
// import * as deleteAwsKey from './commands/deleteAwsKey';
import * as encryptEnvCommand from './commands/encryptEnvCommand';

void yargs(hideBin(process.argv))
    .command(defaultCommmand)
    .command(encryptEnvCommand)
    .command(decryptSecCommand)
    // .command(createAwsKey)
    // .command(deleteAwsKey)
    .parse();
