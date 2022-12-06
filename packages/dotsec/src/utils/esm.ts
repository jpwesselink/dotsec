import Arborist from "@npmcli/arborist";
import fs from "fs";
import path from "path";
export const esModuleIsInstalled = (moduleName: string): Promise<boolean> => {
	return Promise.resolve(
		require.resolve(`${moduleName}/package.json`, { paths: [process.cwd()] }),
	)
		.then((packageJsonPath) => {
			const packageJson = require(packageJsonPath);
			return packageJson.type === "module";
		})
		.catch(() => false);
};

export function npmls(cb) {
	require("child_process").exec("npm ls --json", function (err, stdout) {
		if (err) {
			return cb(err);
		}
		cb(null, JSON.parse(stdout));
	});
}

export const meh = async () => {
	console.log("current ", process.cwd());
	const arb = new Arborist({
		global,
		legacyPeerDeps: false,
		path: process.cwd(),
	});

	arb.loadActual().then((me) => {
		console.log(me);
	});
};

export function getAppRootDir() {
	let currentDir = __dirname;
	while (!fs.existsSync(path.join(currentDir, "package.json"))) {
		currentDir = path.join(currentDir, "..");
	}
	return currentDir;
}
