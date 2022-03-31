import { GetParametersByPathCommand } from '@aws-sdk/client-ssm';

import { commonCliOptions } from '../commonCliOptions';
import { handleCredentialsAndRegion } from '../lib/partial-commands/handleCredentialsAndRegion';
import { YargsHandlerParams } from '../types';
import { getSSMClient } from '../utils/ssm';

export const command = 'debug';
export const desc = 'Debugs all the things';

export const builder = {
    'aws-profile': commonCliOptions.awsProfile,
    'aws-region': commonCliOptions.awsRegion,
    'aws-key-alias': commonCliOptions.awsKeyAlias,
    'aws-assume-role-arn': commonCliOptions.awsAssumeRoleArn,
    verbose: commonCliOptions.verbose,
    yes: { ...commonCliOptions.yes },
} as const;

export const handler = async (
    argv: YargsHandlerParams<typeof builder>,
): Promise<void> => {
    try {
        const { credentialsAndOrigin, regionAndOrigin } =
            await handleCredentialsAndRegion({
                argv: { ...argv },
                env: { ...process.env },
            });

        const ssmClient = getSSMClient({
            configuration: {
                credentials: credentialsAndOrigin.value,
                region: regionAndOrigin.value,
            },
            verbose: argv.verbose,
        });

        const getParametersByPathCommand = new GetParametersByPathCommand({
            Path: `arn:aws:ssm:eu-west-1:060014838622:parameter/dotsec/*`,
            Recursive: true,
        });

        const commandResult = await ssmClient.send(getParametersByPathCommand);
        console.log(commandResult);
    } catch (e) {
        console.error(e);
    }
};
