import {
	DotSecEncoding,
	DotSecEncrypted,
	DotSecEncryptedFlattened,
	DotSecExpandedTree,
	DotSecFlattenedTree,
	DotSecLeaf,
	DotSecPlainText,
	DotSecPlainTextFlattened,
	DotSecTree,
	isDotSecTree,
} from "./types";
export const flattenTree = <
	Encoding extends DotSecEncoding,
	Tree extends DotSecTree<Encoding, DotSecExpandedTree> | DotSecLeaf<Encoding>,
>(
	tree: Tree,
): DotSecTree<Encoding, DotSecFlattenedTree> => {
	const lazy: DotSecTree<Encoding, DotSecFlattenedTree> = {};

	const innerParser = (
		leafOrTree: DotSecTree<Encoding, DotSecExpandedTree> | DotSecLeaf<Encoding>,
		paths: Array<string> = [],
	) => {
		if (isDotSecTree(leafOrTree)) {
			Object.entries(leafOrTree).map(([key, value]) => {
				innerParser(value, [...paths, key]);
			});
		} else {
			lazy[paths.join("/")] = leafOrTree;
		}
	};

	innerParser(tree);
	return lazy;
};

export const flattenPlainText = (
	dotSec: DotSecPlainText,
): DotSecPlainTextFlattened => {
	return { ...dotSec, plaintext: flattenTree(dotSec.plaintext) };
};

export const flattenEncrypted = (
	dotSec: DotSecEncrypted,
): DotSecEncryptedFlattened => {
	return { ...dotSec, encrypted: flattenTree(dotSec.encrypted) };
};

const expandTree = <
	Encoding extends DotSecEncoding,
	Tree extends DotSecTree<Encoding, DotSecFlattenedTree>,
>(
	tree: Tree,
): DotSecTree<Encoding, DotSecExpandedTree> => {
	const lazy: DotSecTree<Encoding, DotSecExpandedTree> = {};
	Object.entries(tree).map(([key, value]) => {
		const paths = key.split("/");
		let current = lazy;
		paths.forEach((pathKey, index) => {
			if (!current[pathKey]) {
				if (index === paths.length - 1) {
					current[pathKey] = value;
				} else {
					current[pathKey] = {};
				}
			}
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			current = current[pathKey];
		});
	});

	return lazy;
};

export const expandPlainText = (
	dotSec: DotSecPlainTextFlattened,
): DotSecPlainText => {
	return { ...dotSec, plaintext: expandTree(dotSec.plaintext) };
};

export const expandEncrypted = (
	dotSec: DotSecEncryptedFlattened,
): DotSecEncrypted => {
	return { ...dotSec, encrypted: expandTree(dotSec.encrypted) };
};
