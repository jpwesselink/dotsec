import { Command } from 'commander';
import { spawn } from 'cross-spawn';

import { TermSignals } from './SignalTermination';
export const createProgram = ({
    execute,
    version,
    command,
    commandArgs,
}: {
    execute: boolean;
    version: string;
    command?: string;
    commandArgs?: string[];
}) => {
    const program = new Command();

    const p = program
        .version(version, '-v, --version')
        .usage('[options] <command> [...args]')
        // .option('-e, --environments [env1,env2,...]', 'The rc file environment(s) to use', (list) => list.split(','))
        .option('--aws-key-alias [awsKeyAlias]', 'AWS KMS key alias')
        .option('--aws-profile [awsProfile]', 'AWS profile')
        .option('-e, --env <envFile>', 'Custom env file (default: ./.env)')
        .option('-s, --sec <secFile>', 'Custom sec file (default: ./.sec)')
        // .option('--fallback', 'Fallback to default env file path, if custom env file path not found')
        .option('--no-override', 'Do not override existing environment variables')
        .option('--silent', 'Ignore any env-cmd errors and only fail on executed program failure.')
        .option('--use-shell', 'Execute the command in a new shell with the given environment')
        .option('--verbose', 'Print helpful debugging information')
        .option('-x, --expand-envs', 'Replace $var in args and command with environment variables')
        .allowUnknownOption(true)
        .action((opts: { verbose?: boolean }) => {
            if (execute) {
                console.log('giii', opts, command, commandArgs);
                if (command) {
                    const proc = spawn(command, commandArgs || [], { stdio: 'inherit', env: { MEKKER: '123', ...process.env } });

                    // Handle any termination signals for parent and child proceses
                    const signals = new TermSignals({ verbose: opts.verbose || true });
                    signals.handleUncaughtExceptions();
                    signals.handleTermSignals(proc);
                }
            }
        });

    p.addCommand(
        new Command('convert')
            .usage('[options]')
            .option('--exnv <envFile>', 'Custom env file (default: ./.env)')
            .option('--sec <secFile>', 'Custom sec file (default: ./.sec)')
            .allowUnknownOption(true)
            .action((ops) => {
                console.log({ ...ops });
            })
            // .action(({ envFile, secFile }: { envFile?: string; secFile?: string }) => {
            //     console.log({ envFile, secFile });
            // })
            .addHelpCommand(),
    );
    return p;
};
