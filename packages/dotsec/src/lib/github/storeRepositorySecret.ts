import crypto from "crypto";

import sodium from "tweetsodium";
import { Octokit } from "@octokit/core";

const storeRepositorySecret = async (options: {
	personalAccessToken: string;
	username: string;
	repository: string;
	secretName: string;
}) => {
	const { personalAccessToken, username, repository, secretName } = options;
	const octokit = new Octokit({ auth: personalAccessToken });

	const encryptionKey = crypto.randomBytes(16).toString("hex");
	const publicKeyResponse = await octokit.request(
		`GET /repos/${username}/${repository}/actions/secrets/public-key`,
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

	console.log(
		`PUT /repos/${username}/${repository}/actions/secrets/${secretName}`,
		{
			owner: username,
			repo: repository,
			secret_name: secretName,
			key_id: publicKeyId,
			encrypted_value: encryptedEncryptionKey,
		},
	);
	// await octokit.request(
	// 	`PUT /repos/${username}/${repository}/actions/secrets/${secretName}`,
	// 	{
	// 		owner: username,
	// 		repo: repository,
	// 		secret_name: secretName,
	// 		key_id: publicKeyId,
	// 		encrypted_value: encryptedEncryptionKey,
	// 	},
	// );

	return encryptionKey;
};
export default storeRepositorySecret;
