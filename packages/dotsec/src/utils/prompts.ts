import prompts from "prompts";
export const promptConfirm = async ({
	predicate,
	skip,
	message,
}: {
	predicate?: (...args: unknown[]) => Promise<boolean> | boolean;
	skip?: boolean;
	message: string;
}): Promise<{ confirm: boolean }> => {
	if (skip === true) {
		return { confirm: true };
	} else {
		const result = predicate ? await predicate() : true;
		if (result) {
			return await prompts({
				type: "confirm",
				name: "confirm",
				message: () => {
					return message;
				},
			});
		}
	}
	return { confirm: true };
};
