export type DotsecConfig = {
	aws: {
		keyAlias: string;
		region?: string;
		profile?: string;
		assumeRoleArn?: string;
		assumeRoleSessionDuration?: number;
	};
};

export type PartialConfig = Partial<DotsecConfig>;
