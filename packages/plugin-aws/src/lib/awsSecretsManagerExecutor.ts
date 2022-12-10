import { handleCredentialsAndRegion } from "../utils/handleCredentialsAndRegion";
import {
	CreateSecretCommand,
	CreateSecretRequest,
	DescribeSecretCommand,
	ResourceNotFoundException,
	SecretsManagerClient,
	UpdateSecretCommand,
} from "@aws-sdk/client-secrets-manager";

export const createAwsSecretsManagerExecutor = async (options?: {
	region?: string;
}) => {
	const { region } = options || {};

	const { credentialsAndOrigin, regionAndOrigin } =
		await handleCredentialsAndRegion({
			argv: {},
			env: { ...process.env },
		});

	const secretsManagerClient = new SecretsManagerClient({
		credentials: credentialsAndOrigin.value,
		region: region || regionAndOrigin.value,
	});

	return {
		async createOrUpdateSecrets(
			createSecretRequests: (CreateSecretRequest & {
				envVariableName: string;
			})[],
		) {
			const createSecretCommands: CreateSecretCommand[] = [];
			const updateSecretCommands: UpdateSecretCommand[] = [];
			const createOrUpdateSecretsOverview: {
				envVariableName: string;
				operation: string;
				name: string;
				region: string;
			}[] = [];

			for (const createSecretRequest of createSecretRequests) {
				// create secret
				// check if secret exists
				const describeSecretCommand = new DescribeSecretCommand({
					SecretId: createSecretRequest.Name,
				});
				try {
					const result = await secretsManagerClient.send(describeSecretCommand);
					// update secret
					updateSecretCommands.push(
						new UpdateSecretCommand({
							SecretId: result.ARN,
							SecretString: createSecretRequest.SecretString,
						}),
					);

					createOrUpdateSecretsOverview.push({
						envVariableName: createSecretRequest.envVariableName,
						operation: "update",
						name: createSecretRequest.Name as string,
						region: region || regionAndOrigin.value,
					});
				} catch (e) {
					if (e instanceof ResourceNotFoundException) {
						// create secret
						createSecretCommands.push(
							new CreateSecretCommand({
								Name: createSecretRequest.Name,
								SecretString: createSecretRequest.SecretString,
							}),
						);

						createOrUpdateSecretsOverview.push({
							envVariableName: createSecretRequest.envVariableName,
							operation: "create",
							name: createSecretRequest.Name as string,
							region: region || regionAndOrigin.value,
						});
					} else {
						throw e;
					}
				}
			}

			return {
				createSecretCommands,
				updateSecretCommands,
				createOrUpdateSecretsOverview,
				execute: async () => {
					for (const createSecretCommand of createSecretCommands) {
						await secretsManagerClient.send(createSecretCommand);
					}

					for (const updateSecretCommand of updateSecretCommands) {
						await secretsManagerClient.send(updateSecretCommand);
					}
				},
			};
		},
	};
};
