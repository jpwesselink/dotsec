export const badAssParser = (source: string) => {
	// split lines
	const lines = source.split("\n");

	// support multiline values
	let multiline = false;
	// iterate over lines
	for (const line of lines) {
		// check if line is a comment
		if (line.startsWith("#")) {
			console.log("comment", line);
		} else {
			// check if line starts with KEY=VALUE using a regex
			const match = line.match(/(\w+)=(\w+)/);
			if (match) {
				console.log("key value", match);
				// check if value is multiline
				// does it start with a double quote, a quote or a backtick?
				// does it end with a double quote, a quote or a backtick?
				// does it contain a newline?
				// if so, set multiline to true
				// if not, set multiline to false
				// if multiline is true, append the line to the previous line
				// if multiline is false, return the line
			} else if (line.trim() === "") {
				console.log("blank line", line);
			} else {
				console.log("unknown line", line);
			}
		}
	}
};

if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;

	describe("badAssParser", () => {
		it("should parse a string", () => {
			expect(
				badAssParser(`# comment
asdasd=something


`),
			).toBe("test");
		});
	});
}
