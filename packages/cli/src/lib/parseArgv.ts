import { createProgram } from './createProgram';

export const parseArgv = ({
    version,
    args,
}: {
    version: string;
    args: string[];
}) => {
    // strip off node and program. Why?
    const program = createProgram({
        execute: false,
        version,
    }).allowUnknownOption(true);
    const all = program.parse(args);

    const command = all.args[0];
    const commandArgs = [...args].splice(args.indexOf(command) + 1);
    const options = [...args].slice(0, args.indexOf(command));

    return { command, commandArgs, options, all };
};
