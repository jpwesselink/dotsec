import { FromEnv } from "../types";

export const resolveFromEnv = (options: {
	fromEnvValue?: FromEnv;
	env: NodeJS.ProcessEnv;
	variables: Record<string, string>;
}) => {
	const { fromEnvValue, env, variables } = options;

	if (!fromEnvValue) {
		return "";
	}
	if (typeof fromEnvValue === "string") {
		return fromEnvValue;
	}
	if (fromEnvValue.fromEnv in env) {
		return env[fromEnvValue.fromEnv];
	}
	if (fromEnvValue.fromEnv in variables) {
		return variables[fromEnvValue.fromEnv];
	}
	if (fromEnvValue.required) {
		throw new Error(
			`Could not resolve path prefix from environment variable "${fromEnvValue.fromEnv}"`,
		);
	}
	return "";
};
