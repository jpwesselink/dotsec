import { promptOverwriteIfFileExists, writeContentsToFile } from "./lib/io";
import { DotsecPluginPKEHandlers } from "./types";
import { Command } from "commander";
import { readContentsFromFile, strong } from "dotsec";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as url from "url";
import { TextEncoder } from "util";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
export const dotsecPluginPKE: DotsecPluginPKEHandlers = async (options) => {
	const config = options.dotsecConfig;

	const configPublicPemFile = config.defaults?.plugins?.pke?.publicPemFile;
	const configPrivatePemFile = config.defaults?.plugins?.pke?.privatePemFile;

	return {
		name: "pke",
		cliHandlers: {
			encrypt: {
				encryptionEngineName: "Pke",
				triggerOptionValue: "pke",

				options: {
					publicPemFile: {
						flags: "--public-pem-file, --publicPemFile <publicPemFile>",
						description: `Public PEM file${
							configPublicPemFile ? ", default value from config file" : ""
						}`,
						defaultValue: configPublicPemFile || "dotsec-public.pem",
						env: "PUBLIC_PEM_FILE",
					},
					publicPem: {
						flags: "--public-pem, --publicPem <publicPem>",
						description: "Public PEM string",
						env: "PUBLIC_PEM",
					},
				},
				handler: async ({ plaintext, publicPemFile, publicPem }) => {
					let pem: string | undefined;
					if (publicPem) {
						pem = publicPem;
					} else if (publicPemFile) {
						pem = fs.readFileSync(publicPemFile, "utf8");
					}
					if (!pem) {
						throw new Error("No public PEM found");
					}
					const plaintextUint8Array = new TextEncoder().encode(plaintext);
					const chunkSize = 100;
					const cipherTextParts: string[] = [];
					for (let i = 0; i < plaintextUint8Array.length; i += chunkSize) {
						const chunk = plaintextUint8Array.slice(i, i + chunkSize);

						const cipherTextBuffer = crypto.publicEncrypt(
							{
								key: pem,
							},
							chunk,
						);

						// serialize to base64
						const cipherText = cipherTextBuffer.toString("base64");

						cipherTextParts.push(cipherText);
					}
					// encrypt plaintext with public key

					return Promise.resolve(cipherTextParts.join("\n"));
				},
			},
			decrypt: {
				encryptionEngineName: "Pke",
				triggerOptionValue: "pke",
				options: {
					privatePemFile: {
						flags: "--private-pem-file, --privatePemFile <privatePemFile>",
						description: `Private PEM file${
							configPrivatePemFile ? ", default value from config file" : ""
						}`,
						defaultValue: configPrivatePemFile || "dotsec-private.pem",
						env: "PRIVATE_PEM_FILE",
					},
					privatePem: {
						flags: "--private-pem, --privatePem <privatePem>",
						description: "Private PEM string",
						env: "PRIVATE_PEM",
					},
				},
				handler: async ({ ciphertext, privatePemFile, privatePem }) => {
					let pem: string | undefined;
					if (privatePem) {
						pem = privatePem;
					} else if (privatePemFile) {
						pem = fs.readFileSync(privatePemFile, "utf8");
					}
					if (!pem) {
						throw new Error("No private pem file or private pem provided");
					}
					const cipherTexts = ciphertext.split("\n");
					const plaintext = cipherTexts
						.map((cipherTextPart) => {
							const ciphertextPartBuffer = Buffer.from(
								cipherTextPart,
								"base64",
							);

							if (pem) {
								const plaintextPartBuffer = crypto.privateDecrypt(
									{
										key: pem.split(String.raw`\n`).join("\n"),
										passphrase: "",
									},
									ciphertextPartBuffer,
								);
								const plaintextPart = plaintextPartBuffer.toString("utf8");
								return plaintextPart;
							}
						})
						.join("");
					// unserialize base64 ciphertext, and decrypt using private key

					// turn decryptedBuffer into a string

					return Promise.resolve(plaintext);
				},
			},
		},
		addCliCommand: async ({ program }) => {
			const subProgram = program
				.enablePositionalOptions()
				.passThroughOptions()
				.command("pke");

			subProgram
				.command("init")
				.description("Init dotsec config file with PKE plugin")
				.option("--yes", "Skip confirmation")
				.action(async (_options, command: Command) => {
					const { configFile = "dotsec.config.ts", yes } =
						command.optsWithGlobals<{
							configFile: string;
							yes: boolean;
						}>();

					try {
						// read config file from ./templates/dotsec.config.ts
						const configTemplate = await readContentsFromFile(
							path.resolve(__dirname, "../src/templates/dotsec.config.ts"),
						);

						const dotsecConfigOverwriteResponse =
							await promptOverwriteIfFileExists({
								filePath: configFile,
								skip: yes,
							});
						if (
							dotsecConfigOverwriteResponse === undefined ||
							dotsecConfigOverwriteResponse.overwrite === true
						) {
							await writeContentsToFile(configFile, configTemplate);
							console.log(`Wrote config file to ${strong(configFile)}`);
						}
					} catch (e) {
						command.error(e);
					}
				});

			subProgram
				.command("create-keypair")
				.description("Create a new public/private key pair")
				.option("--yes", "Skip confirmation")
				.action(async (_options) => {
					const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
						modulusLength: 4096,
						publicKeyEncoding: {
							type: "spki",
							format: "pem",
						},
						privateKeyEncoding: {
							type: "pkcs8",
							format: "pem",
							cipher: "aes-256-cbc",
							passphrase: "",
						},
					});

					// write to disk
					// prompt for overwrite
					const publicKeyFile = "dotsec-public.pem";
					const privateKeyFile = "dotsec-private.pem";

					const publicKeyFileOverwriteResponse =
						await promptOverwriteIfFileExists({
							filePath: publicKeyFile,
							skip: false,
						});
					if (
						publicKeyFileOverwriteResponse === undefined ||
						publicKeyFileOverwriteResponse.overwrite === true
					) {
						await writeContentsToFile(publicKeyFile, publicKey);
						console.log(`Wrote public pem to to ${strong(publicKeyFile)}`);
					}
					const privateKeyFileOverwriteResponse =
						await promptOverwriteIfFileExists({
							filePath: privateKeyFile,
							skip: false,
						});
					if (
						privateKeyFileOverwriteResponse === undefined ||
						privateKeyFileOverwriteResponse.overwrite === true
					) {
						await writeContentsToFile(privateKeyFile, privateKey);
						console.log(`Wrote private pem to to ${strong(privateKeyFile)}`);
					}
				});
		},
	};
};
