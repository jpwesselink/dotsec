const LINE =
	/(?:^|^)\s*(?:export+)?(\s+)?([\w.-]+)(\s*=\s*?|:\s+?)(\s*'(\\'|[^'])*'|\s*"(\\"|[^"])*"|\s*`(\\`|[^`])*`|[^#\r\n]+)?\s*(#.*)?(?:$|$)/gm;

export type ParseResult = {
	key: string;
	value: string;
	keyValue: string;
};
export type ParseResults = {
	[key: string]: ParseResult;
};
// Parser src into an Object
export function parseRaw(src: string): ParseResults {
	const obj: ParseResults = {};

	// Convert buffer to string
	let lines = src.toString();

	// Convert line breaks to same format
	lines = lines.replace(/\r\n?/gm, "\n");

	let match;
	while ((match = LINE.exec(lines)) != null) {
		const key = match[2];

		// Default undefined or null to empty string
		let value = match[4] || "";

		// Remove whitespace
		value = value.trim();

		// Check if double quoted
		const maybeQuote = value[0];

		// Remove surrounding quotes
		// value = value.replace(/^(['"`])([\s\S]*)\1$/mg, '$2')

		// Expand newlines if double quoted
		if (maybeQuote === '"') {
			value = value.replace(/\\n/g, "\n");
			value = value.replace(/\\r/g, "\r");
		}

		// Add to object
		obj[key] = { key, value, keyValue: match[0] };
	}

	return obj;
}
