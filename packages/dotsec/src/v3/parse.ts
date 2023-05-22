const LINE =
	/^(#.*)|(\s?\r?\n)|(?:^|^)\s*(?:export\s+)?([\w.-]*)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?(\s*)(#.*)?(?:$|$)/gm;

export type ParsedBlocks = {
	type: "value" | "comment" | "whitespace";
	key?: string;
	value?: string;
	raw?: string;
}[];

export type ParseResult = {
	blocks: ParsedBlocks;
	obj: Record<string, string>;
};
// Parser src into an Object
export type Parse = (src: string) => ParseResult;
export const parse: Parse = (src) => {
	const obj: Record<string, string> = {};
	const blocks: ParsedBlocks = [];

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
