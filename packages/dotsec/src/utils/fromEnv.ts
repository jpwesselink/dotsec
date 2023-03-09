import { expand } from "dotenv-expand";

export const resolveFromEnv = (options: {
	fromEnvValue?: string;
	env: NodeJS.ProcessEnv;
	variables: Record<string, string>;
}) => {
	const { fromEnvValue, env, variables } = options;

	if (!fromEnvValue) {
		return "";
	}

	return (
		expand({
			ignoreProcessEnv: true,
			parsed: {
				// add standard env variables
				...(env as Record<string, string>),
				// add custom env variables, either from .env or .sec, (or empty object if none)
				...variables,
				RESOLVED: fromEnvValue || "",
			},
		}) as { parsed?: { RESOLVED?: string } }
	).parsed?.RESOLVED;
};
