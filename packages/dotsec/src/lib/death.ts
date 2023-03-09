const defaultConfig = {
	uncaughtException: false,
	SIGINT: true,
	SIGTERM: true,
	SIGQUIT: true,
};

let DEBUG = false;

type Handler = (_signal: string, unknown, ...args: unknown[]) => void;
type Callback = (...args: unknown[]) => void;
type Handlers = [string, Handler][];
const ON_DEATH = (callback: Callback) => {
	const handlers: Handlers = [];
	Object.keys(defaultConfig).forEach(function (key) {
		const val = defaultConfig[key];
		let handler: Handler;
		if (val) {
			if (DEBUG) {
				handler = function (_signal: string, ...args) {
					args.unshift(key);
					console.log(`Trapped ${key}`);
					callback.apply(null, args);
				};
				process.on(key, handler);
			} else {
				handler = function (_signal: string, ...args) {
					args.unshift(key);
					callback.apply(null, args);
				};
				process.on(key, handler);
			}
			handlers.push([key, handler]);
		}
	});
	return function OFF_DEATH() {
		handlers.forEach(function (args) {
			const key = args[0];
			const handler = args[1];
			process.removeListener(key, handler);
		});
	};
};

export default (arg?: { DEBUG?: boolean; debug?: boolean } | Callback) => {
	if (typeof arg === "object") {
		if (arg["debug"]) DEBUG = arg.debug;
		if (arg["DEBUG"]) DEBUG = arg.DEBUG;
		arg.debug = undefined;
		arg.DEBUG = undefined;

		Object.keys(arg).forEach(function (key) {
			defaultConfig[key] = arg[key];
		});

		if (DEBUG)
			console.log("ON_DEATH: debug mode enabled for pid [%d]", process.pid);

		return ON_DEATH;
	} else if (typeof arg === "function") {
		return ON_DEATH(arg);
	}
};
