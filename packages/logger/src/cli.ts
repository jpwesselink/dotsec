/* eslint-disable @typescript-eslint/no-shadow */
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';

import * as defaultCommmand from './commands/defaultCommand';
void yargs(hideBin(process.argv))
    .command(defaultCommmand)
    .command(
        'serve [port]',
        'start the server',
        (yargs) => {
            return yargs.positional('port', {
                describe: 'port to bind on',
                default: 5000,
            });
        },
        (argv) => {
            if (argv.verbose) {
                console.info(`start server on :${argv.port}`);
            }
            console.log('serve', argv.port);
        },
    )
    .option('verbose', {
        alias: 'v',
        type: 'boolean',
        description: 'Run with verbose logging',
    })
    .parse();
