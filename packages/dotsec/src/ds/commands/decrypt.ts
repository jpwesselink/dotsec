import { Command } from "commander";
import { handleCredentialsAndRegion } from "../../lib/partial-commands/handleCredentialsAndRegion";
import { encryptPlainText } from "../../lib/wtf/crypto";
import fs from "node:fs";
import path from "node:path";
import { DotSecPlainText } from "../../lib/wtf/types";
import { DotsecConfig } from "../../lib/config/types";
import { getLogger, prettyCode, strong } from "../../utils/logger";
import { promptOverwriteIfFileExists } from "../../utils/io";
import { toDotSec } from "../../lib/wtf/dotsec";
type Formats = {
	env?: string;
	sec?: string;
	secrets?: string;
	encryptedSecrets?: string;
};

const writeOut = async (options: {
	targetFile: string;
	converted: string;
	skipPromptForOverride: boolean;
}) => {
	const { info } = getLogger();
	const {
		targetFile: encryptedSecretsPath,
		converted,
		skipPromptForOverride,
	} = options;

	info(`target: ${strong(encryptedSecretsPath)}\n`);
	info(prettyCode(converted));
	info("\n");
	const overwriteResponse = await promptOverwriteIfFileExists({
		filePath: encryptedSecretsPath,
		skip: skipPromptForOverride,
	});
	// easy peasy, write json

	if (overwriteResponse === undefined || overwriteResponse.overwrite === true) {
		fs.writeFileSync(encryptedSecretsPath, converted);
		info(
			`Wrote encrypted secrets to ${strong(
				`./${path.relative(process.cwd(), encryptedSecretsPath)}`,
			)}`,
		);
	}
};
const decrypt = async (
	options: {
		awsKeyAlias?: string;
		awsRegion?: string;
		verbose: boolean;
		config: DotsecConfig;
		secrets: string;
		skipPromptForOverride: boolean;
	} & (
		| { encryptedSecrets: string; sec?: never }
		| { encryptedSecrets?: never; sec: string }
	),
) => {
	console.log("options", options);
	const { credentialsAndOrigin, regionAndOrigin } =
		await handleCredentialsAndRegion({
			argv: {},
			env: { ...process.env },
		});

	const {
		secrets,
		awsKeyAlias,
		awsRegion,
		verbose,
		encryptedSecrets,
		sec,
		skipPromptForOverride,
	} = options;
	const dotSecPlainText = JSON.parse(
		fs.readFileSync(secrets, "utf8"),
	) as DotSecPlainText;
	const dotSecEncrypted = await encryptPlainText({
		dotSecPlainText,
		credentials: credentialsAndOrigin.value,
		region: awsRegion || regionAndOrigin.value,
		keyAlias: awsKeyAlias,
		verbose: verbose,
	});

	if (encryptedSecrets) {
		const targetFile = path.resolve(process.cwd(), encryptedSecrets);
		const converted = JSON.stringify(dotSecEncrypted, null, 2);

		await writeOut({
			targetFile,
			converted,
			skipPromptForOverride,
		});
	} else if (sec) {
		const dotSec = toDotSec({
			dotSecEncrypted,
			verbose: verbose,
		});

		const targetFile = path.resolve(process.cwd(), sec);
		await writeOut({
			targetFile,
			converted: dotSec,
			skipPromptForOverride,
		});
	} else {
		throw new Error("Must provide either encryptedSecrets or sec");
	}
};
export default (program: Command) => {
	const encryptProgram = program
		.enablePositionalOptions()
		.command("decrypt")
		.option(
			"--secrets [secrets]",
			"Run command with secrets.json file",
			"secrets.json",
		)
		.option("--awsKeyAlias, --aws-key-alias [awsKeyAlias]")
		.option("--awsRegion, --aws-region [awsRegion]")
		.usage("encrypt [--secrets secrets.json] [to]")
		.summary("Encrypt secrets.json file")
		.description("Encrypts secrets.json to secrets.encrypted.json.\n1123")

		.action(async (_options: Formats, command: Command) => {
			//
			const verbose = Boolean(command.getOptionValue("verbose"));
			const secrets = command.getOptionValue("secrets") as string;
			const config = command.getOptionValue("dotsecConfig") as DotsecConfig;
			const awsKeyAlias =
				(command.getOptionValue("awsKeyAlias") as string) ||
				config.aws.keyAlias;
			const awsRegion =
				(command.getOptionValue("awsRegion") as string) || config.aws.region;

			await decrypt({
				config,
				verbose,
				secrets,
				awsKeyAlias,
				awsRegion,
				encryptedSecrets: "encrypted.secrets.json",
				skipPromptForOverride: false,
			});
		});

	const toProgram = encryptProgram
		.command("to")
		.usage("[--encryptedSecrets [encrypted.secrets.json]] [--sec [.sec]]")
		.summary("specifies encryption output format")

		.action(async (_options: Formats, command: Command) => {
			command.help();
		});
	toProgram
		.command("dotsec")
		.option("--sec, [sec]", "Target dotsec file", ".sec")
		.action(async (_options: Formats, command: Command) => {
			const config = command.parent?.parent?.getOptionValue(
				"dotsecConfig",
			) as DotsecConfig;
			const verbose = Boolean(
				command.parent?.parent?.parent?.getOptionValue("verbose"),
			);
			const secrets = command.parent?.parent?.getOptionValue(
				"secrets",
			) as string;
			const sec = command.getOptionValue("sec") as string;
			const awsKeyAlias =
				(command.parent?.parent?.parent?.getOptionValue(
					"awsKeyAlias",
				) as string) || config.aws.keyAlias;
			const awsRegion =
				(command.parent?.parent?.parent?.getOptionValue(
					"awsRegion",
				) as string) || config.aws.region;

			await decrypt({
				config,
				verbose,
				secrets,
				awsKeyAlias,
				awsRegion,
				sec,
				skipPromptForOverride: false,
			});
		});
	toProgram
		.command("encryptedSecrets")
		.option(
			"--encryptedSecrets,--encrypted-secrets [encryptedSecrets]",
			"Target encrypted secrets file",
			"encrypted.secrets.json",
		)
		.action(async (_options: Formats, command: Command) => {
			const config = command.parent?.parent?.getOptionValue(
				"dotsecConfig",
			) as DotsecConfig;
			const verbose = Boolean(
				command.parent?.parent?.parent?.getOptionValue("verbose"),
			);
			const secrets = command.parent?.parent?.getOptionValue(
				"secrets",
			) as string;
			const encryptedSecrets = command.getOptionValue(
				"encryptedSecrets",
			) as string;
			const awsKeyAlias =
				(command.parent?.parent?.parent?.getOptionValue(
					"awsKeyAlias",
				) as string) || config.aws.keyAlias;
			const awsRegion =
				(command.parent?.parent?.parent?.getOptionValue(
					"awsRegion",
				) as string) || config.aws.region;

			await decrypt({
				config,
				verbose,
				secrets,
				awsKeyAlias,
				awsRegion,
				encryptedSecrets,
				skipPromptForOverride: false,
			});
		});
	return encryptProgram;
};
