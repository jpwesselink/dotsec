import { getCredentialsProfileRegion, printVerboseCredentialsProfileRegion } from '../../utils/getCredentialsProfileRegion';

export const handleCredentialsAndRegion = async ({
    argv,
    env,
}: {
    argv: { awsRegion?: string; awsProfile?: string; verbose?: boolean };
    env: {
        AWS_PROFILE?: string | undefined;
        AWS_ACCESS_KEY_ID?: string | undefined;
        AWS_SECRET_ACCESS_KEY?: string | undefined;
        AWS_REGION?: string | undefined;
        AWS_DEFAULT_REGION?: string | undefined;
        TZ?: string;
    };
}) => {
    const { credentialsAndOrigin, regionAndOrigin } = await getCredentialsProfileRegion({
        argv: { region: argv.awsRegion, profile: argv.awsProfile },
        env: {
            ...env,
        },
    });

    if (argv.verbose === true) {
        console.log(printVerboseCredentialsProfileRegion({ credentialsAndOrigin, regionAndOrigin }));
    }

    if (!credentialsAndOrigin || !regionAndOrigin) {
        if (!credentialsAndOrigin) {
            console.error('Could not find credentials');
            throw new Error('Could not find credentials');
        }
        if (!regionAndOrigin) {
            console.error('Could not find region');
            throw new Error('Could not find region');
        }
    }

    return { credentialsAndOrigin, regionAndOrigin };
};
