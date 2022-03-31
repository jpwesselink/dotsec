import { stat } from 'fs/promises';

import prompts from 'prompts';

export const fileExists = async (source: string): Promise<boolean> => {
    try {
        await stat(source);
        return true;
    } catch {
        return false;
    }
};

export const promptOverwriteIfFileExists = async ({
    filePath,
    skip,
}: {
    filePath: string;
    skip?: boolean;
}) => {
    let overwriteResponse: prompts.Answers<'overwrite'> | undefined;

    if ((await fileExists(filePath)) && skip !== true) {
        overwriteResponse = await prompts({
            type: 'confirm',
            name: 'overwrite',
            message: () => {
                return `Overwrite '${filePath}' ?`;
            },
        });
    } else {
        overwriteResponse = undefined;
    }
    return overwriteResponse;
};
