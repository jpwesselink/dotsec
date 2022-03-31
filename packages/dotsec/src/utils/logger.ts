import chalk from 'chalk';
// eslint-disable-next-line @typescript-eslint/naming-convention
let _logger: Pick<Console, 'info' | 'error'>;

export const getLogger = () => {
    if (!_logger) {
        _logger = console;
    }

    return _logger;
};
export const writeLine = (str: string) => {
    process.stdout.write(str);
};
export const bold = (str: string): string => chalk.greenBright.bold(str);
export const underline = (str: string): string => chalk.cyanBright.bold(str);
export const clientLogger = {
    debug(content: object) {
        console.log(content);
    },
    info(content: object) {
        console.log(content);
    },
    warn(content: object) {
        console.log(content);
    },
    error(content: object) {
        console.error(content);
    },
};
