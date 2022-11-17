import {
    DotSecEncryptedValues,
    DotSecExpandValues,
    DotSecFile,
    DotSecFullConfig,
    DotSecPlainTextValues,
} from './types';

export const encrypt = async (
    dotSecFile: DotSecFile<
        DotSecFullConfig,
        DotSecExpandValues,
        DotSecPlainTextValues
    >,
): Promise<
    DotSecFile<DotSecFullConfig, DotSecExpandValues, DotSecEncryptedValues>
> => {};
