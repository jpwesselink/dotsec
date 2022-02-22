import chalk from 'chalk';
// eslint-disable-next-line @typescript-eslint/naming-convention
let _logger: Pick<Console, 'info' | 'error'>;

export const getLogger = () => {
    if (!_logger) {
        return console;
    }

    return _logger;
};

export const bold = (str: string): string => chalk.yellowBright.bold(str);
export const underline = (str: string): string => chalk.cyanBright.bold(str);
