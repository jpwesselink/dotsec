import path from 'path';

import { bundleRequire } from 'bundle-require';
import JoyCon from 'joycon';

import { loadJson } from '../json';
import { getValidatedConfig } from './config';
import { ConfigFileType, DotSecFile, DotSecConfig } from './types';

export const getDotSecFile = async <Encrypted extends boolean = false>({
    options,
    userConfig,
}: {
    options: { filenames: Array<string> };
    userConfig: DotSecConfig<false>;
}): Promise<{ config: DotSecFile<true, false, Encrypted>; type: string }> => {
    const { filenames } = options || {};
    const cwd = process.cwd();
    const configJoycon = new JoyCon();
    const configPath = await configJoycon.resolve({
        files: filenames,
        cwd,
        stopDir: path.parse(cwd).root,
        packageKey: 'secrets',
    });
    if (configPath) {
        let configType: ConfigFileType | undefined;
        if (!configType) {
            throw new Error(`Config file ${configPath} is not supported`);
        }
        if (configPath.endsWith('.json')) {
            configType = 'json';
            const data = (await loadJson(configPath)) as DotSecFile<
                false,
                false,
                Encrypted
            >;
            const validatedConfig = getValidatedConfig(data, userConfig);

            return {
                type: configType,
                config: {
                    ...data.config,
                    ...validatedConfig,
                },
            };
        } else if (configPath.endsWith('.ts')) {
            const bundleRequireResult = await bundleRequire({
                filepath: configPath,
            });
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const data = (bundleRequireResult.mod.dotsec ||
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                bundleRequireResult.mod.default ||
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                bundleRequireResult.mod) as DotSecFile<false, false, Encrypted>;

            const validatedConfig = getValidatedConfig(data, userConfig);

            return {
                type: configType,
                config: {
                    ...data,
                    ...validatedConfig,
                },
            };
        }
    }
    throw new Error('No secrets file found');
};
