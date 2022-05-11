import {
    fromEnv,
    fromIni,
    fromTemporaryCredentials,
} from '@aws-sdk/credential-providers';
import { loadSharedConfigFiles } from '@aws-sdk/shared-ini-file-loader';

import {
    CredentialsAndOrigin,
    ProfileAndOrigin,
    RegionAndOrigin,
} from '../types';
import { bold, underline } from './logger';

export const getCredentialsProfileRegion = async ({
    argv,
    env,
}: {
    argv: {
        profile?: string;
        region?: string;
        assumeRoleArn?: string;
    };
    env: {
        AWS_PROFILE?: string;
        AWS_ACCESS_KEY_ID?: string;
        AWS_SECRET_ACCESS_KEY?: string;
        AWS_REGION?: string;
        AWS_DEFAULT_REGION?: string;
        AWS_ASSUME_ROLE_ARN?: string | undefined;
        TZ?: string;
    };
}) => {
    const sharedConfigFiles = await loadSharedConfigFiles();
    let credentialsAndOrigin: CredentialsAndOrigin | undefined = undefined;
    let profileAndOrigin: ProfileAndOrigin | undefined = undefined;
    let regionAndOrigin: RegionAndOrigin | undefined = undefined;
    if (argv.profile) {
        profileAndOrigin = {
            value: argv.profile,
            origin: `command line option: ${bold(argv.profile)}`,
        };
        credentialsAndOrigin = {
            value: await fromIni({
                profile: argv.profile,
            })(),
            origin: `${bold(`[${argv.profile}]`)} in credentials file`,
        };
    } else if (env.AWS_PROFILE) {
        profileAndOrigin = {
            value: env.AWS_PROFILE,
            origin: `env variable ${bold('AWS_PROFILE')}: ${underline(
                env.AWS_PROFILE,
            )}`,
        };
        credentialsAndOrigin = {
            value: await fromIni({
                profile: env.AWS_PROFILE,
            })(),
            origin: `env variable ${underline('AWS_PROFILE')}: ${bold(
                env.AWS_PROFILE,
            )}`,
        };
    } else if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
        credentialsAndOrigin = {
            value: await fromEnv()(),
            origin: `env variables ${bold('AWS_ACCESS_KEY_ID')} and ${bold(
                'AWS_SECRET_ACCESS_KEY',
            )}`,
        };
    } else if (sharedConfigFiles.credentialsFile?.default) {
        profileAndOrigin = {
            value: 'default',
            origin: `${bold('[default]')} in credentials file`,
        };
        credentialsAndOrigin = {
            value: await fromIni({
                profile: 'default',
            })(),
            origin: `profile ${bold('[default]')}`,
        };
    }

    if (argv.region) {
        regionAndOrigin = {
            value: argv.region,
            origin: `command line option: ${bold(argv.region)}`,
        };
    } else if (env.AWS_REGION) {
        regionAndOrigin = {
            value: env.AWS_REGION,
            origin: `env variable ${bold('AWS_REGION')}: ${underline(
                env.AWS_REGION,
            )}`,
        };
    } else if (env.AWS_DEFAULT_REGION) {
        regionAndOrigin = {
            value: env.AWS_DEFAULT_REGION,
            origin: `env variable ${bold('AWS_DEFAULT_REGION')}: ${underline(
                env.AWS_DEFAULT_REGION,
            )}`,
        };
    } else if (profileAndOrigin) {
        const foundRegion =
            sharedConfigFiles?.configFile?.[profileAndOrigin.value]?.region;

        if (foundRegion) {
            regionAndOrigin = {
                value: foundRegion,
                origin: `${bold(
                    `[profile ${profileAndOrigin.value}]`,
                )} in config file`,
            };
        }
    }

    const assumedRole = argv.assumeRoleArn || env.AWS_ASSUME_ROLE_ARN;
    if (assumedRole) {
        const origin = argv.assumeRoleArn
            ? 'command line option'
            : 'env variable';
        credentialsAndOrigin = {
            value: await fromTemporaryCredentials({
                masterCredentials: credentialsAndOrigin?.value,
                params: {
                    RoleArn: assumedRole,
                },

                clientConfig: {
                    region: regionAndOrigin?.value,
                },
            })(),
            origin: `${origin} ${bold(`[${assumedRole}]`)}`,
        };
    }

    return { credentialsAndOrigin, regionAndOrigin, profileAndOrigin };
};

export const printVerboseCredentialsProfileRegion = ({
    credentialsAndOrigin,
    regionAndOrigin,
    profileAndOrigin,
}: {
    credentialsAndOrigin?: CredentialsAndOrigin;
    regionAndOrigin?: RegionAndOrigin;
    profileAndOrigin?: ProfileAndOrigin;
}): string => {
    const out: string[] = [];
    if (profileAndOrigin) {
        out.push(`Got profile name from ${profileAndOrigin.origin}`);
    }
    if (credentialsAndOrigin) {
        out.push(`Resolved credentials from ${credentialsAndOrigin.origin}`);
    }
    if (regionAndOrigin) {
        out.push(`Resolved region from ${regionAndOrigin.origin}`);
    }
    return out.join('\n');
};
