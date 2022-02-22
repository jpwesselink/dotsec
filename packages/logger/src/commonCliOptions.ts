// import regions from 'aws-regions/regions.json';

export const commonCliOptions = {
    awsProfile: {
        string: true,
        describe: 'AWS profile',
    },
    awsKeyAlias: {
        string: true,
        describe: 'AWS KMS asymmetric key alias',
    },
    awsKey: {
        string: true,
        describe: 'AWS KMS asymmetric key arn',
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
