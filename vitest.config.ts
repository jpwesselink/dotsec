import { defineConfig } from "vitest/config";

export default defineConfig({
	define: {
		"import.meta.vitest": "undefined",
	},
	test: {
		reporters: "verbose",
		// include: [
		// 	"./**/*.{spec,test}.{js,jsx,ts,tsx}",
		// 	"packages/**/*.{spec,test}.{js,jsx,ts,tsx}",
		// ],
		includeSource: ["./packages/**/*.ts"],
	},
});
