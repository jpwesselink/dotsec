import prompts from "prompts";

export const promptConfirm = async ({
	predicate,
	skip,
	message,
}: {
	predicate?: (...args: unknown[]) => Promise<boolean> | boolean;
	skip?: boolean;
	message: string;
}): Promise<boolean> => {
	if (skip === true) {
		return true;
	} else {
		const result = predicate ? await predicate() : true;
		if (result) {
			const confirmResult = await prompts({
				type: "confirm",
				name: "confirm",
				message: () => {
					return message;
				},
			});

			if (confirmResult.confirm === true) {
				return true;
			}
		}
	}
	return false;
};

export const promptExecute = async ({
	skip,
	message,
	execute,
}: {
	skip?: boolean;
	message: string;
	execute: () => unknown | Promise<unknown>;
}) => {
	let shouldExecute = false;
	if (skip) {
		shouldExecute = true;
	} else {
		const promptResponse = await prompts({
			type: "confirm",
			name: "confirm",
			message,
		});

		if (promptResponse.confirm === true) {
			shouldExecute = true;
		}
	}

	if (shouldExecute) {
		await execute();
	}
};
