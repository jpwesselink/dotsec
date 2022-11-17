export const fromEntries = <T>(
    entries: Array<[string, T]>,
): { [key: string]: T } => {
    return entries.reduce((all, [k, v]) => {
        return { ...all, [k]: v };
    }, {} as { [key: string]: T });
};
