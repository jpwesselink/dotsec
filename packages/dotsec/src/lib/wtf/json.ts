import fs from 'fs';
import path from 'node:path';

export function jsoncParse(data: string) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-implied-eval
        return new Function('return ' + data.trim())();
    } catch {
        // Silently ignore any error
        // That's what tsc/jsonc-parser did after all
        return {};
    }
}

export const loadJson = async (filepath: string) => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return jsoncParse(await fs.promises.readFile(filepath, 'utf8'));
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(
                `Failed to parse ${path.relative(process.cwd(), filepath)}: ${
                    error.message
                }`,
            );
        } else {
            throw error;
        }
    }
};
