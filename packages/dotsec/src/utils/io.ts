import { stat } from 'fs/promises';

export const fileExists = async (source: string): Promise<boolean> => {
    try {
        await stat(source);
        return true;
    } catch {
        return false;
    }
};
