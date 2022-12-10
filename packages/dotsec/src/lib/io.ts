import fs, { stat } from "node:fs/promises";
import path from "node:path";
import prompts from "prompts";

export const readContentsFromFile = async (
	filePath: string,
): Promise<string> => {
	return await fs.readFile(filePath, "utf-8");
};

export const writeContentsToFile = async (
	filePath: string,
	contents: string,
): Promise<void> => {
	return await fs.writeFile(filePath, contents, "utf-8");
};

export const fileExists = async (source: string): Promise<boolean> => {
	try {
		await stat(source);
		return true;
	} catch {
		return false;
	}
};

export const promptOverwriteIfFileExists = async ({
	filePath,
	skip,
}: {
	filePath: string;
	skip?: boolean;
}) => {
	let overwriteResponse: prompts.Answers<"overwrite"> | undefined;

	if ((await fileExists(filePath)) && skip !== true) {
		overwriteResponse = await prompts({
			type: "confirm",
			name: "overwrite",
			message: () => {
				return `Overwrite './${path.relative(process.cwd(), filePath)}' ?`;
			},
		});
	} else {
		overwriteResponse = undefined;
	}
	return overwriteResponse;
};
