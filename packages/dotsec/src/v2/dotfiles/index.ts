import { ParseResult, parse } from "../parse";
import { Err, Ok, Result } from "@sniptt/monads/build";
import fs from "node:fs/promises";
import { Stream } from "node:stream";

export const loadDotfile: (dotfile: string) => Promise<Result<string, string>> =
	async (dotfile) => {
		try {
			const dotfileContent = await fs.readFile(dotfile, "utf-8");
			return Ok(dotfileContent);
		} catch (e) {
			return Err(e);
		}
	};

export const writeDotfile: (
	dotfile: string,
	data:
		| string
		| NodeJS.ArrayBufferView
		| Iterable<string | NodeJS.ArrayBufferView>
		| AsyncIterable<string | NodeJS.ArrayBufferView>
		| Stream,
) => Promise<Result<boolean, string>> = async (dotfile, data) => {
	try {
		await fs.writeFile(dotfile, data, "utf-8");
		return Ok(true);
	} catch (e) {
		return Err(e);
	}
};

export const parseDotfileContent: (
	dotfileContent: string,
) => Result<ParseResult, string> = (dotfileContent) => {
	try {
		const parsedDotfileContent = parse(dotfileContent);
		return Ok(parsedDotfileContent);
	} catch (e) {
		return Err(e);
	}
};
