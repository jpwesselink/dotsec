import fs from 'fs';
import path from 'node:path';

import YAML from 'yaml';

export const loadYml = async (filepath: string) => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return YAML.parse(await fs.promises.readFile(filepath, 'utf8'));
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
