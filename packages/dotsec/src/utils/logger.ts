import chalk from "chalk";
import { highlight, Theme, plain } from "cli-highlight";
let _logger: Pick<Console, "info" | "error" | "table">;
export const getLogger = () => {
	if (!_logger) {
		_logger = console;
	}

	return _logger;
};
export const writeLine = (str: string) => {
	process.stdout.write(str);
};
export const emphasis = (str: string): string => chalk.yellowBright(str);
export const strong = (str: string): string => chalk.yellow.bold(str);

const myTheme: Theme = {
	attr: chalk.yellow.bold,
	string: chalk.yellowBright.dim,
	params: chalk.red,
	deletion: chalk.red.strikethrough,
	number: plain,
};

export const prettyCode = (str: string): string => {
	return highlight(str, { theme: myTheme });
};
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
