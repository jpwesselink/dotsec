import {
    SecretsManagerClient,
    SecretsManagerClientConfig,
} from '@aws-sdk/client-secrets-manager';

export const getSecretsManagerClient = ({
    configuration,
}: {
    verbose?: boolean;
    configuration: SecretsManagerClientConfig;
}) => {
    const secretsManagerClient = new SecretsManagerClient(configuration);
    return secretsManagerClient;
};
