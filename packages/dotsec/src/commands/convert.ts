import { CommandModule } from 'yargs';

import { commonCliOptions } from '../commonCliOptions';

// export const command = 'convert';
// export const desc = `Converts between .env, .sec, secrets.json and secrets.encrypted.json.
// If '--use-top-levels-as-environments' is set, it will create a .env file for each top level key in the encrypted secrets file.`;

const convertModule: CommandModule<
    { 'env-file': { type: string } },
    { envFile: { type: string } }
> = {
    command: 'convert',
    describe: 'does stuff',
    builder: {
        'env-file': commonCliOptions.envFile,
        'search-path': commonCliOptions.searchpath,
        'aws-profile': commonCliOptions.awsProfile,
        'aws-region': commonCliOptions.awsRegion,
        'aws-key-alias': commonCliOptions.awsKeyAlias,
        'aws-assume-role-arn': commonCliOptions.awsAssumeRoleArn,
        'aws-assume-role-session-duration':
            commonCliOptions.awsAssumeRoleSessionDuration,
        'use-top-levels-as-environments':
            commonCliOptions.useTopLevelsAsEnvironments,
        verbose: commonCliOptions.verbose,
        yes: { ...commonCliOptions.yes },
    },
    handler: (a) => {
        console.log(a.d);
        console.log(a['env-file']);
    },
};

export default convertModule;

// export const builder = {
//     'env-file': commonCliOptions.envFile,
//     'search-path': commonCliOptions.searchpath,
//     'aws-profile': commonCliOptions.awsProfile,
//     'aws-region': commonCliOptions.awsRegion,
//     'aws-key-alias': commonCliOptions.awsKeyAlias,
//     'aws-assume-role-arn': commonCliOptions.awsAssumeRoleArn,
//     'aws-assume-role-session-duration':
//         commonCliOptions.awsAssumeRoleSessionDuration,
//     'use-top-levels-as-environments':
//         commonCliOptions.useTopLevelsAsEnvironments,
//     verbose: commonCliOptions.verbose,
//     yes: { ...commonCliOptions.yes },
// } as const;

// export const handler = async (
//     argv: YargsHandlerParams<typeof builder>,
// ): Promise<void> => {
//     const config = await getConfig();

//     const { info, error } = getLogger();
//     try {
//         const defaultRegion = config.aws.region || argv.awsRegion;
//         const { credentialsAndOrigin, regionAndOrigin } =
//             await handleCredentialsAndRegion({
//                 argv: {
//                     ...argv,
//                     awsRegion: defaultRegion,
//                     awsProfile: config.aws.profile || argv.awsProfile,
//                     awsAssumeRoleArn:
//                         config.aws.assumeRoleArn || argv.awsAssumeRoleArn,
//                     awsAssumeRoleSessionDuration:
//                         config.aws.assumeRoleSessionDuration ||
//                         argv.awsAssumeRoleSessionDuration,
//                 },
//                 env: { ...process.env },
//             });

//         const { fileType, dotSecEncrypted } = await getDotSecEncrypted({
//             defaultConfig: {
//                 config: {
//                     aws: {
//                         keyAlias: 'alias/dotsec',
//                         regions: [regionAndOrigin.value],
//                     },
//                 },
//             },
//             options: {
//                 verbose: argv.verbose,
//             },
//         });
//         if (!dotSecEncrypted.encrypted) {
//             throw new Error(`Expected 'encrypted' property, but got none`);
//         }
//         // const dotSecEncryptedFlattened = flattenEncrypted(dotSecEncrypted);
//         // const expanded = expandEncrypted(dotSecEncryptedFlattened);

//         const dotSecPlainText = await decryptedEncrypted({
//             dotSecEncrypted,
//             credentials: credentialsAndOrigin.value,
//             region: regionAndOrigin.value,
//             keyAlias: argv.awsKeyAlias,
//             verbose: argv.verbose,
//         });

//         if (
//             argv.useTopLevelsAsEnvironments ||
//             dotSecEncrypted.config?.useTopLevelsAsEnvironments
//         ) {
//             const dotEnvsPerEnvironment = toDotEnvPerEnvironment({
//                 dotSecPlainText,
//                 verbose: argv.verbose,
//             });

//             for (const [environment, dotEnv] of Object.entries(
//                 dotEnvsPerEnvironment,
//             )) {
//                 const fileName = `.env.${environment}`;
//                 const dotEnvPath = path.resolve(process.cwd(), fileName);

//                 info(`target: ${strong(dotEnvPath)}\n`);
//                 info(prettyCode(dotEnv));
//                 info(`\n`);
//                 const overwriteResponse = await promptOverwriteIfFileExists({
//                     filePath: dotEnvPath,
//                     skip: argv.yes,
//                 });

//                 if (
//                     overwriteResponse === undefined ||
//                     overwriteResponse.overwrite === true
//                 ) {
//                     fs.writeFileSync(dotEnvPath, dotEnv);
//                 }

//                 // write to file, prompt if file exists
//             }
//         } else {
//             const dotEnv = toDotEnv({
//                 dotSecPlainText,
//                 verbose: argv.verbose,
//                 searchPath: argv.searchPath,
//             });

//             const fileName = argv.envFile || `.env`;
//             const dotEnvPath = path.resolve(process.cwd(), fileName);
//             info(`target: ${strong(dotEnvPath)}\n`);
//             info(prettyCode(dotEnv));
//             info(`\n`);

//             const overwriteResponse = await promptOverwriteIfFileExists({
//                 filePath: dotEnvPath,
//                 skip: argv.yes,
//             });

//             if (
//                 overwriteResponse === undefined ||
//                 overwriteResponse.overwrite === true
//             ) {
//                 fs.writeFileSync(dotEnvPath, dotEnv);
//             }
//         }
//     } catch (e) {
//         error(e);
//     }
// };
