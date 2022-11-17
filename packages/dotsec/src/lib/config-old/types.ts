export type DotsecConfig = {
	/**
	 * defines the object depth from the root of the object, children past this depth will be serialized as JSON
	 *
	 * ```json
	 * { a: { b: { c: 3 } } }
	 * ```
	 * with a maxDepth of 1 will result in { a: "{ "b": { "c": 3 }" } }
	 */
	maxDepth?: number;
	aws: {
		keyAlias: string;
		region?: string;
		profile?: string;
		assumeRoleArn?: string;
		assumeRoleSessionDuration?: number;
	};
};

export type PartialConfig = Partial<DotsecConfig>;
