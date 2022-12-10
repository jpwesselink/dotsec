import fs from "node:fs";
import * as ts from "typescript";

export const patchConfigFile = (options: {
	configFile: string;
	config?: {
		aws?: {
			region?: string;
			kms?: {
				keyAlias?: string;
			};
		};
	};
}) => {
	const printer: ts.Printer = ts.createPrinter();
	const source = fs.readFileSync(options.configFile, "utf8");

	const transformer =
		<T extends ts.Node>(context: ts.TransformationContext) =>
		(rootNode: T) => {
			function visit(node: ts.Node): ts.Node {
				node = ts.visitEachChild(node, visit, context);
				if (node.kind === ts.SyntaxKind.StringLiteral) {
					const kmsNode = node?.parent?.parent?.parent;
					if (options.config?.aws?.kms?.keyAlias) {
						if (kmsNode?.getChildAt(0)?.getText() === "kms") {
							const awsNode = kmsNode?.parent?.parent;
							if (awsNode?.getChildAt(0).getText() === "aws") {
								return ts.createStringLiteral(
									options.config?.aws?.kms?.keyAlias,
								);
							}
						}
					}
					if (options.config?.aws?.region) {
						if (node?.parent?.getChildAt(0)?.getText() === "region") {
							const awsNode = node?.parent?.parent?.parent;

							// const awsNode = kmsNode?.parent?.parent;
							if (awsNode?.getChildAt(0).getText() === "aws") {
								return ts.createStringLiteral(options.config?.aws?.region);
							}
						}
					}
				}

				return node;
			}
			return ts.visitNode(rootNode, visit);
		};

	const sourceFile: ts.SourceFile = ts.createSourceFile(
		"test.ts",
		source,
		ts.ScriptTarget.ES2015,
		true,
		ts.ScriptKind.TS,
	);

	// Options may be passed to transform
	const result: ts.TransformationResult<ts.SourceFile> =
		ts.transform<ts.SourceFile>(sourceFile, [transformer]);

	const transformedSourceFile: ts.SourceFile = result.transformed[0];

	const transformedSource = printer.printFile(transformedSourceFile);
	result.dispose();

	return transformedSource;
};
