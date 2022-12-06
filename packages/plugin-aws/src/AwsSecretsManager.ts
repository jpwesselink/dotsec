import {
	CreateSecretCommand,
	DescribeSecretCommand,
	UpdateSecretCommand,
	CreateSecretRequest,
	SecretsManagerClient,
	ResourceNotFoundException,
} from "@aws-sdk/client-secrets-manager";
import { handleCredentialsAndRegion } from "./handleCredentialsAndRegion";

export const AwsSecretsManager = async (options?: {
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
		async push(createSecretRequests: CreateSecretRequest[]) {
			const createSecretCommands: CreateSecretCommand[] = [];
			console.log("createSecretReddquests", createSecretRequests);
			const updateSecretCommands: UpdateSecretCommand[] = [];
			for (const createSecretRequest of createSecretRequests) {
				// create secret
				// check if secret exists
				const describeSecretCommand = new DescribeSecretCommand({
					SecretId: createSecretRequest.Name,
				});
				try {
					const result = await secretsManagerClient.send(describeSecretCommand);
					console.log("got one");
					// update secret
					updateSecretCommands.push(
						new UpdateSecretCommand({
							SecretId: result.ARN,
							SecretString: createSecretRequest.SecretString,
						}),
					);
				} catch (e) {
					if (e instanceof ResourceNotFoundException) {
						// create secret
						console.log("got one");

						createSecretCommands.push(
							new CreateSecretCommand({
								Name: createSecretRequest.Name,
								SecretString: createSecretRequest.SecretString,
							}),
						);
					}
				}
			}

			return {
				createSecretCommands,
				updateSecretCommands,
				push: async () => {
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
