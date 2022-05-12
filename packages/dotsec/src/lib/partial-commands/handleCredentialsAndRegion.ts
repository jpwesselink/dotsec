import {
    getCredentialsProfileRegion,
    printVerboseCredentialsProfileRegion,
} from '../../utils/getCredentialsProfileRegion';

export const handleCredentialsAndRegion = async ({
    argv,
    env,
}: {
    argv: {
        awsRegion?: string;
        awsProfile?: string;
        verbose?: boolean;
        awsAssumeRoleArn?: string;
        awsAssumeRoleSessionDuration?: number;
    };
    env: {
        AWS_PROFILE?: string | undefined;
        AWS_ACCESS_KEY_ID?: string | undefined;
        AWS_SECRET_ACCESS_KEY?: string | undefined;
        AWS_REGION?: string | undefined;
        AWS_DEFAULT_REGION?: string | undefined;
        AWS_ASSUME_ROLE_ARN?: string | undefined;
        AWS_ASSUME_ROLE_SESSION_DURATION?: string | undefined;
        TZ?: string;
    };
}) => {
    const { credentialsAndOrigin, regionAndOrigin, profileAndOrigin } =
        await getCredentialsProfileRegion({
            argv: {
                region: argv.awsRegion,
                profile: argv.awsProfile,
                assumeRoleArn: argv.awsAssumeRoleArn,
                assumeRoleSessionDuration: argv.awsAssumeRoleSessionDuration,
            },
            env: {
                ...env,
            },
        });

    if (argv.verbose === true) {
        console.log(
            printVerboseCredentialsProfileRegion({
                credentialsAndOrigin,
                regionAndOrigin,
                profileAndOrigin,
            }),
        );
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
