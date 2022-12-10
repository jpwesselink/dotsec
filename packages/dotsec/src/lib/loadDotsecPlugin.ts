import { DotsecPluginModule } from "../types/plugin";

export const loadDotsecPlugin = async (options: {
	name: string;
}): Promise<DotsecPluginModule> => {
	return import(options.name).then((imported) => {
		return imported.default;
	});
};
