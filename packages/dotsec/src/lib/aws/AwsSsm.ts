import {
	PutParameterCommand,
	PutParameterRequest,
	SSMClient,
} from "@aws-sdk/client-ssm";
import { handleCredentialsAndRegion } from "./handleCredentialsAndRegion";

export const AwsSsm = async (options?: {
	region?: string;
}) => {
	const { region } = options || {};

	const { credentialsAndOrigin, regionAndOrigin } =
		await handleCredentialsAndRegion({
			argv: {},
			env: { ...process.env },
		});

	const ssmClient = new SSMClient({
		credentials: credentialsAndOrigin.value,
		region: region || regionAndOrigin.value,
	});

	return {
		async put(putParameterRequests: PutParameterRequest[]): Promise<void> {
			for (const putParameterRequest of putParameterRequests) {
				const command = new PutParameterCommand({
					...putParameterRequest,
					Overwrite: true,
				});
				await ssmClient.send(command);
			}
		},
	};
};
