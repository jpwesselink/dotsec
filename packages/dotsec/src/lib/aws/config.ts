import { DSConfig } from './types';

export const getValidatedConfig = (
    partialConfig: DSConfig,
    userConfig?: DSConfig,
): DSConfig<true> => {
    const keyAlias: string | undefined =
        partialConfig?.config?.aws?.keyAlias ||
        userConfig?.config?.aws?.keyAlias;

    if (!keyAlias) {
        throw new Error('Expected keyAlias, but gone none');
    }
    const regions: Array<string | undefined> | undefined =
        partialConfig?.config?.aws?.regions || userConfig?.config?.aws?.regions;

    if (!regions) {
        throw new Error('Expected regions, but gone none');
    }
    return {
        config: {
            aws: {
                keyAlias,
                regions: regions as Array<string>,
            },
        },
    };
};
