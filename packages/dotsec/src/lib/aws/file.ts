import path from 'path';

import JoyCon from 'joycon';

import { loadJson } from '../json';
import { getValidatedConfig } from './config';
import { ConfigFileType, DotSecFile, DSConfig } from './types';

export const getDotSecFile = async ({
    options,
    userConfig,
}: {
    options?: { filename?: string };
    userConfig: DSConfig;
}): Promise<{ config: DotSecFile<true>; type: string }> => {
    const { filename } = options || {};
    const cwd = process.cwd();
    const configJoycon = new JoyCon();
    const configPath = await configJoycon.resolve({
        files: filename
            ? [filename]
            : [
                  'secrets.json',
                  //   'secrets.ts',
                  //   'secrets.js',
                  //   'secrets.cjs',
                  //   'secrets.mjs',
              ],
        cwd,
        stopDir: path.parse(cwd).root,
        packageKey: 'secrets',
    });
    if (configPath) {
        let configType: ConfigFileType | undefined;
        if (configPath.endsWith('.json')) {
            configType = 'json';
            const data = (await loadJson(configPath)) as DotSecFile;
            const validatedConfig = getValidatedConfig(data, userConfig);

            return {
                type: configType,
                config: {
                    parameterStore: data?.parameterStore,
                    secretsManager: data?.secretsManager,
                    ...validatedConfig,
                },
            };
        }

        if (!configType) {
            throw new Error(`Config file ${configPath} is not supported`);
        }
        // const secrets = await bundleRequire({
        //     filepath: configPath,
        // });

        // const retrievedConfig =
        //     // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        //     (secrets.mod.dotsec ||
        //         // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        //         secrets.mod.default ||
        //         secrets.mod) as AWSVariables;
        // return {
        //     type: configType,
        //     config: {
        //         // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        //         ...retrievedConfig,
        //         config: {
        //             aws: {
        //                 regions:
        //                     retrievedConfig?.config?.aws?.regions &&
        //                     Array.isArray(retrievedConfig?.config.aws?.regions)
        //                         ? (retrievedConfig.config.aws
        //                               .regions as string[])
        //                         : defaultConfig.config.aws.regions,
        //                 keyAlias:
        //                     retrievedConfig?.config?.aws?.keyAlias ||
        //                     defaultConfig.config.aws.keyAlias,
        //             },
        //         },
        //     },
        // };
    }
    throw new Error('No secrets file found');
};
