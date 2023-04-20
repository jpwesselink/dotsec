const LINE =
	/^(#.*)|(\s?\r?\n)|(?:^|^)\s*(?:export\s+)?([\w.-]*)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?(\s*)(#.*)?(?:$|$)/gm;

export type ParseResult = {
	type: "value" | "comment" | "whitespace";
	key?: string;
	value?: string;
	raw?: string;
}[];

// Parser src into an Object
export const parse = (src: string) => {
	const obj: Record<string, string> = {};
	const blocks: ParseResult = [];

	// Convert buffer to string
	let lines = src.toString();

	// Convert line breaks to same format
	lines = lines.replace(/\r\n?/gm, "\n");

	let match;
	while ((match = LINE.exec(lines)) != null) {
		const key = match[3];

		if (match?.[1]?.[0] === "#") {
			blocks.push({ type: "comment", raw: match[1] });
		} else if (match?.[2]) {
			blocks.push({ type: "whitespace", raw: match[2] });
		} else {
			// Default undefined or null to empty string
			let value = match[4] || "";

			// Remove whitespace
			value = value.trim();

			// Check if double quoted
			const maybeQuote = value[0];

			// Remove surrounding quotes
			value = value.replace(/^(['"`])([\s\S]*)\1$/gm, "$2");

			// Expand newlines if double quoted
			if (maybeQuote === '"') {
				value = value.replace(/\\n/g, "\n");
				value = value.replace(/\\r/g, "\r");
			}

			obj[key] = value;

			// Add to object
			blocks.push({
				type: "value",
				key,
				value,
				raw: value + (match[5] ? match[5] : "") + (match[6] ? match[6] : ""),
			});
		}
	}

	return { blocks, obj };
};

if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;

	it("parse", () => {
		const input1 = "KEY=value";
		const input2 = 'KEY="value"';
		const input3 = "KEY='value'";
		const input4 = "KEY=value #   this is a comment";

		// const expectedResult1 = [
		//   { type: 'value', key: 'KEY', value: 'value', raw: 'value' },
		// ];
		// const expectedResult2 = [
		//   { type: 'value', key: 'KEY', value: 'value', raw: '"value"' },
		// ];
		// const expectedResult3 = [
		//   { type: 'value', key: 'KEY', value: 'value', raw: "'value'" },
		// ];
		// const expectedResult4 = [
		//   {
		//     type: 'value',
		//     key: 'KEY',
		//     value: 'value',
		//     raw: 'value #   this is a comment',
		//   },
		// ];

		expect(parse(input1)).toMatchInlineSnapshot(`
			{
			  "blocks": [
			    {
			      "key": "KEY",
			      "raw": "value",
			      "type": "value",
			      "value": "value",
			    },
			  ],
			  "obj": {
			    "KEY": "value",
			  },
			}
		`);
		expect(parse(input2)).toMatchInlineSnapshot(`
			{
			  "blocks": [
			    {
			      "key": "KEY",
			      "raw": "value",
			      "type": "value",
			      "value": "value",
			    },
			  ],
			  "obj": {
			    "KEY": "value",
			  },
			}
		`);
		expect(parse(input3)).toMatchInlineSnapshot(`
			{
			  "blocks": [
			    {
			      "key": "KEY",
			      "raw": "value",
			      "type": "value",
			      "value": "value",
			    },
			  ],
			  "obj": {
			    "KEY": "value",
			  },
			}
		`);
		expect(parse(input4)).toMatchInlineSnapshot(`
      {
        "blocks": [
          {
            "key": "KEY",
            "raw": "value#   this is a comment",
            "type": "value",
            "value": "value",
          },
        ],
        "obj": {
          "KEY": "value",
        },
      }
    `);
	});
}
