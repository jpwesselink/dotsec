import { SsmAvailableCases } from "../constants";
import {
	AwsSsmExpandedPushValue,
	AwsSsmPushValue,
	CreateConfig,
	Decrypt,
	DefaultsAwsSsm,
	PushOptions,
} from "../types";
import { resolveFromEnv } from "../utils/fromEnv";
import { PutParameterRequest } from "@aws-sdk/client-ssm";
import * as changeCase from "change-case";

const expandPushValue = (options: {
	pushValue: AwsSsmPushValue;
	defaultsAwsSsm: DefaultsAwsSsm;
	pathPrefix: string;
}): AwsSsmExpandedPushValue => {
	const { pushValue, defaultsAwsSsm, pathPrefix } = options;
	// check if the value is a string
	let expanded: AwsSsmExpandedPushValue;
	if (typeof pushValue === "string") {
		expanded = {
			variable: pushValue,
		};
	} else {
		expanded = { ...pushValue };
	}

	let ssmChangeCase: SsmAvailableCases;
	if (expanded.changeCase) {
		ssmChangeCase = expanded.changeCase;
	} else {
		ssmChangeCase = defaultsAwsSsm.changeCase;
	}
	const ssmTransformCase = (str: string) => {
		if (ssmChangeCase) {
			return changeCase[ssmChangeCase](str);
		}
		return str;
	};

	let parameterPath: string;
	if (expanded.path) {
		// does the path start with a slash?
		if (expanded.path.startsWith("/")) {
			parameterPath = expanded.path;
		} else {
			parameterPath = `${pathPrefix}${expanded.path}`;
		}
	} else {
		parameterPath = `${pathPrefix}${expanded.variable}`;
	}
	return {
		variable: expanded.variable,
		path: ssmTransformCase(parameterPath),
		changeCase: expanded.changeCase || defaultsAwsSsm.changeCase,
		type: expanded.type || defaultsAwsSsm.type,
	};
};

export const configurePush =
	(options: { mergeConfig: CreateConfig; decrypt: Decrypt }) =>
	async (cmdOptions: PushOptions) => {
		const { decrypt, mergeConfig } = options;
		const { expanded: dotenv, config } = await decrypt(cmdOptions);

		const commandConfig = mergeConfig(cmdOptions).unwrap().config;

		// get push env vars
		Object.entries(config?.commands?.push?.to || {}).reduce(
			(acc, [pushTarget, pushValues]) => {
				if (pushTarget === "aws-ssm") {
					const ssmPathPrefixFromEnv = resolveFromEnv({
						env: process.env,
						fromEnvValue: commandConfig.defaults.aws.ssm.pathPrefix,
						variables: dotenv,
					});

					if (
						ssmPathPrefixFromEnv &&
						!ssmPathPrefixFromEnv.startsWith("/") &&
						!ssmPathPrefixFromEnv.endsWith("/")
					) {
						throw new Error(
							`Invalid global path prefix for ssm, must start and end with a slash, but got ${ssmPathPrefixFromEnv}`,
						);
					}

					const ssmCommands = pushValues
						.map((pushValue) =>
							expandPushValue({
								pushValue,
								pathPrefix: ssmPathPrefixFromEnv || "",
								defaultsAwsSsm: commandConfig.defaults.aws.ssm,
							}),
						)
						.map((pushValue) => {
							const meh: PutParameterRequest & {
								envVariableName: string;
							} = {
								Name: pushValue.path + pushValue.variable,
								Value: dotenv[pushValue.variable],
								Type: pushValue.type,
								envVariableName: pushValue.variable,
							};
							return meh;
						});
					console.log(123, pushTarget, pushValues, ssmCommands);
				}
				return acc;
			},
			{},
		);
	};
