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

    secFile: {
        string: true,
        describe: '.sec file',
        default: '.sec',
    },
    awsAssumeRoleArn: {
        string: true,
        describe: 'arn or role to assume',
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
