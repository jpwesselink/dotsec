import crypto from "crypto";

import sodium from "tweetsodium";
import { Octokit } from "@octokit/core";

const storeOrganisationSecret = async (options: {
	personalAccessToken: string;
	organisation: string;
	secretName: string;
}) => {
	const { personalAccessToken, organisation, secretName } = options;
	const octokit = new Octokit({ auth: personalAccessToken });

	const encryptionKey = crypto.randomBytes(16).toString("hex");
	const publicKeyResponse = await octokit.request(
		`GET /orgs/${organisation}/actions/secrets/public-key`,
		{
			org: organisation,
		},
	);
	const publicKey = publicKeyResponse.data.key;
	const publicKeyId = publicKeyResponse.data.key_id;

	// Convert the message and key to Uint8Array's (Buffer implements that interface)
	const messageBytes = Buffer.from(encryptionKey);
	const keyBytes = Buffer.from(publicKey, "base64");

	// Encrypt using LibSodium.
	const encryptedBytes = sodium.seal(messageBytes, keyBytes);

	// Base64 the encrypted secret
	const encryptedEncryptionKey = Buffer.from(encryptedBytes).toString("base64");

	console.log(`PUT /orgs/${organisation}/actions/secrets/${secretName}`, {
		org: organisation,
		secret_name: secretName,
		key_id: publicKeyId,
		encrypted_value: encryptedEncryptionKey,
	});
	// await octokit.request(
	// 	`PUT /orgs/${organisation}/actions/secrets/${secretName}`,
	// 	{
	// 		org: organisation,
	// 		secret_name: secretName,
	// 		key_id: publicKeyId,
	// 		encrypted_value: encryptedEncryptionKey,
	// 	},
	// );

	return encryptionKey;
};
export default storeOrganisationSecret;
