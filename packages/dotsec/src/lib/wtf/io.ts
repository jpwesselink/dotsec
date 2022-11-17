import fs from 'node:fs';
import path from 'node:path';

import { bundleRequire } from 'bundle-require';
import JoyCon from 'joycon';

import { getLogger, strong } from '../../utils/logger';
import { loadJson } from './json';
import {
    DotSecConfig,
    DotSecFileType,
    DotSecRequiredConfig,
    DotSecPlainTextByFileType,
    DotSecPlainTextWithOptionalConfig,
    DotSecEncryptedByFileType,
    DotSecEncryptedWithOptionalConfig,
    DotSec,
    DotSecEncoding,
    DotSecExpandedTree,
    DotSecPlaintextEncoding,
    DotSecTree,
} from './types';
import { loadYml } from './yaml';

export const getValidatedConfig = (
    partialConfig: DotSecRequiredConfig,
    userConfig?: DotSecConfig,
): DotSecRequiredConfig => {
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

export const getDotSecPlainText = async ({
    defaultConfig,
    options,
}: {
    defaultConfig: DotSecRequiredConfig;
    options?: { filename?: string; verbose?: boolean };
}): Promise<DotSecPlainTextByFileType> => {
    const { info } = getLogger();
    const { filename, verbose } = options || {};

    const cwd = process.cwd();
    const configJoycon = new JoyCon();
    const files = filename
        ? [filename]
        : [
              'secrets.json',
              'secrets.yaml',
              'secrets.yml',
              'secrets.ts',
              //   'secrets.js',
              //   'secrets.cjs',
              //   'secrets.mjs',
          ];

    if (verbose) {
        info(
            `Looking for file(s) with the following signature(s): ${strong(
                files.join(', '),
            )}`,
        );
    }
    const configPath = await configJoycon.resolve({
        files,
        cwd,
        stopDir: path.parse(cwd).root,
        packageKey: 'secrets',
    });
    if (configPath) {
        if (verbose) {
            info(`Found plaintext secrets at ${strong(configPath)}`);
        }
        let configType: DotSecFileType | undefined;
        let data: DotSecPlainTextWithOptionalConfig | undefined;

        if (configPath.endsWith('.json')) {
            configType = 'json';
            // this is not entirely correct, since it could not contain all the required configuration
            data = (await loadJson(
                configPath,
            )) as DotSecPlainTextWithOptionalConfig;
        } else if (
            configPath.endsWith('.yaml') ||
            configPath.endsWith('.yml')
        ) {
            configType = 'yml';
            // this is not entirely correct, since it could not contain all the required configuration
            data = (await loadYml(
                configPath,
            )) as DotSecPlainTextWithOptionalConfig;
        } else if (configPath.endsWith('.ts')) {
            const bundleRequireResult = await bundleRequire({
                filepath: configPath,
            });
            configType = 'ts';
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            data = (bundleRequireResult.mod.dotsec ||
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                bundleRequireResult.mod.default ||
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                bundleRequireResult.mod) as DotSecPlainTextWithOptionalConfig;
        }

        if (!configType) {
            throw new Error(`Expected configType, but got none`);
        }
        if (!data) {
            throw new Error(`Expected data, but got none`);
        }
        const validatedConfig: DotSecRequiredConfig = {
            config: {
                ...data.config,
                aws: {
                    regions:
                        data?.config?.aws?.regions &&
                        Array.isArray(data?.config?.aws?.regions)
                            ? (data.config.aws.regions as string[])
                            : defaultConfig.config.aws.regions,
                    keyAlias:
                        data?.config?.aws?.keyAlias ||
                        defaultConfig.config.aws.keyAlias,
                },
            },
        };
        return {
            fileType: configType,
            path: configPath,
            dotSecPlainText: {
                ...data,
                ...validatedConfig,
            },
        };
    }
    throw new Error('No secrets file found');
};

export const getDotSecEncrypted = async ({
    defaultConfig,
    options,
}: {
    defaultConfig: DotSecRequiredConfig;
    options?: { filename?: string; verbose?: boolean };
}): Promise<DotSecEncryptedByFileType> => {
    const { filename, verbose } = options || {};

    const cwd = process.cwd();
    const configJoycon = new JoyCon();
    const configPath = await configJoycon.resolve({
        files: filename
            ? [filename]
            : [
                  'secrets.encrypted.json',
                  'secrets.encrypted.yaml',
                  'secrets.encrypted.yml',
                  'secrets.encrypted.ts',
                  //   'secrets.cjs',
                  //   'secrets.mjs',
              ],
        cwd,
        stopDir: path.parse(cwd).root,
        packageKey: 'secrets',
    });
    if (configPath) {
        if (verbose) {
            console.log(`Found encrypted secrets file at ${configPath}`);
        }
        let configType: DotSecFileType | undefined;
        let data: DotSecEncryptedWithOptionalConfig | undefined;
        if (configPath.endsWith('.json')) {
            configType = 'json';
            data = (await loadJson(
                configPath,
            )) as DotSecEncryptedWithOptionalConfig;
        } else if (
            configPath.endsWith('.yaml') ||
            configPath.endsWith('.yml')
        ) {
            configType = path
                .parse(configPath)
                .ext.substring(1) as DotSecFileType;
            data = (await loadYml(
                configPath,
            )) as DotSecEncryptedWithOptionalConfig;
        }
        if (!configType) {
            throw new Error(`Config file ${configPath} is not supported`);
        }
        if (!data) {
            throw new Error('Did not find any data');
        }

        const validatedConfig: DotSecRequiredConfig = {
            config: {
                ...data.config,
                aws: {
                    regions:
                        data?.config?.aws?.regions &&
                        Array.isArray(data?.config?.aws?.regions)
                            ? (data.config.aws.regions as string[])
                            : defaultConfig.config.aws.regions,
                    keyAlias:
                        data?.config?.aws?.keyAlias ||
                        defaultConfig.config.aws.keyAlias,
                },
            },
        };
        return {
            fileType: configType,
            path: configPath,
            dotSecEncrypted: {
                ...data,
                ...validatedConfig,
            },
        };
    }
    throw new Error('No encrypted secrets file found');
};

export const loadFile = async (filepath: string) => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return await fs.promises.readFile(filepath, 'utf8');
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

export const returnSecretsFile = (str: string) => {
    try {
        return JSON.parse(str) as DotSec<
            DotSecTree<DotSecPlaintextEncoding, DotSecExpandedTree>,
            DotSecEncoding
        >;
    } catch (error) {
        return;
    }
};
