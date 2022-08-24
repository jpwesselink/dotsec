import {
    DescribeKeyCommand,
    KMSClient,
    KMSClientConfig,
} from '@aws-sdk/client-kms';

export const getKMSClient = ({
    configuration,
}: {
    verbose?: boolean;
    configuration: KMSClientConfig;
}) => {
    const kmsClient = new KMSClient(configuration);

    return kmsClient;
};

export const getEncryptionAlgorithm = async (
    kmsClient: KMSClient,
    awsKeyAlias: string,
) => {
    // describe key *once*
    const describeKeyCommand = new DescribeKeyCommand({
        KeyId: awsKeyAlias,
    });

    const describeKeyResult = await kmsClient.send(describeKeyCommand);
    const encryptionAlgorithm =
        describeKeyResult.KeyMetadata?.EncryptionAlgorithms?.[0];

    if (encryptionAlgorithm === undefined) {
        throw new Error(`Could not determine encryption algorithm`);
    }

    return encryptionAlgorithm;
};
