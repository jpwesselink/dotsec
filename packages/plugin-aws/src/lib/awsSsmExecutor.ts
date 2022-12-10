import { handleCredentialsAndRegion } from "../utils/handleCredentialsAndRegion";
import {
	PutParameterCommand,
	PutParameterRequest,
	SSMClient,
} from "@aws-sdk/client-ssm";

export const createAwsSsmExecutor = async (options?: {
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
		async put(
			putParameterRequests: (PutParameterRequest & {
				envVariableName: string;
			})[],
		) {
			const putParameterCommands: PutParameterCommand[] = [];
			const putParameterOverview: {
				envVariableName: string;
				name: string;
				type?: string;
				region: string;
			}[] = [];
			for (const putParameterRequest of putParameterRequests) {
				const command = new PutParameterCommand({
					...putParameterRequest,
					Overwrite: true,
				});
				putParameterCommands.push(command);
				putParameterOverview.push({
					envVariableName: putParameterRequest.envVariableName,
					name: putParameterRequest.Name as string,
					type: putParameterRequest.Type,
					region: region || regionAndOrigin.value,
				});
			}

			return {
				putParameterCommands,
				putParameterOverview,
				execute: async () => {
					for (const putParameterCommand of putParameterCommands) {
						await ssmClient.send(putParameterCommand);
					}
				},
			};
		},
	};
};
