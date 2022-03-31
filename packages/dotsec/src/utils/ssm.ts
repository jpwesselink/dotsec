import { SSMClient, SSMClientConfig } from '@aws-sdk/client-ssm';

export const getSSMClient = ({
    configuration,
}: {
    verbose?: boolean;
    configuration: SSMClientConfig;
}) => {
    const ssmClient = new SSMClient(configuration);
    return ssmClient;
};
