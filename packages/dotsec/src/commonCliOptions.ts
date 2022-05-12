// import regions from 'aws-regions/regions.json';

export const commonCliOptions = {
    awsProfile: {
        string: true,
        describe: 'AWS profile',
    },
    awsRegion: {
        string: true,
        describe: 'AWS region',
    },
    awsKeyAlias: {
        string: true,
        default: 'alias/top-secret',
        describe: 'AWS KMS key alias',
    },
    awsKeyArn: {
        string: true,
        describe: 'AWS KMS key id',
    },
    awsKey: {
        string: true,
        describe: 'AWS KMS key arn',
    },
    envFile: {
        string: true,
        describe: '.env file',
        default: '.env',
    },
    ignoreMissingEnvFile: {
        boolean: true,
        describe: `Don't halt on missing .env file`,
    },
    secFile: {
        string: true,
        describe: '.sec file',
        default: '.sec',
    },
    awsAssumeRoleArn: {
        string: true,
        describe:
            'arn or role to assume. Can also be set using the AWS_ASSUME_ROLE_ARN environment variable, or, when using --env-file in the target env file. The cli option overrides the environment variable.',
    },
    awsAssumeRoleSessionDuration: {
        number: true,
        describe:
            'Duration of assume role sessions. Defaults to 3600 seconds. Can also be set using the AWS_ASSUME_ROLE_SESSION_DURATION environment variable, or, when using --env-file in the target env file. The cli option overrides the environment variable.',
    },
    verbose: {
        boolean: true,
        describe: 'Be verbose',
    },
    // regions: {
    //     describe: 'AWS region',
    //     array: true,
    //     choices: regions.map(({ code }) => code),
    // },
    // baseRegion: {
    //     describe: 'AWS region where to store encyption secrets. This is also the same region where *you* should deploy the Top Secret! stack.',
    //     choices: regions.map(({ code }) => code),
    // },
    yes: {
        boolean: true,
        describe: 'Proceeds without confirmation',
    },
    dryRun: {
        boolean: true,
        describe: 'Do a dry run',
    },
} as const;
