import { Command } from 'commander';

import packageJson from '../package.json';

const createConvertProgram = () => {
    const program = new Command('convert');
    return (
        program
            .version(packageJson.version, '-v, --version')
            .usage('[options] <command> [...args]')
            // .option('-e, --environments [env1,env2,...]', 'The rc file environment(s) to use', (list) => list.split(','))
            .option('--exnv <envFile>', 'Custom env file (default: ./.env)')
            .option('--sec <secFile>', 'Custom sec file (default: ./.sec)')
            .addHelpCommand()
    );
};
// const createProgram = () => {
//     const program = new Command();
//     return program
//         .version(packageJson.version, '-v, --version')
//         .addCommand(createConvertProgram())
//         .addHelpCommand();
// };

const wee = () => {
    // strip off node and program. Why?
    const args = process.argv;
    if (args?.[2] === 'convert') {
        const program = createConvertProgram().allowUnknownOption(true);
        const stuff = program.parse(args);

        const command = stuff.args[1];
        const commandArgs = [...args].splice(args.indexOf(command) + 1);
        const options = [...args].slice(0, args.indexOf(command));

        return { command, commandArgs, options };
    }
    return {};
};

const { command, commandArgs, options } = wee();

console.log({ command, commandArgs, options });

// const program = createProgram();
// program
//     .action((opts) => {
//         console.log(command, commandArgs, opts);
//     })
//     .parse([...options]);
