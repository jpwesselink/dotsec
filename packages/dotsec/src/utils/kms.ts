import { KMSClient, KMSClientConfig } from '@aws-sdk/client-kms';

export const getKMSClient = ({
    configuration,
}: {
    verbose?: boolean;
    configuration: KMSClientConfig;
}) => {
    const kmsClient = new KMSClient(configuration);

    return kmsClient;
};
