/**
 * Type for plugin configuration
 * @date 12/7/2022 - 12:52:29 PM
 *
 * @export
 * @typedef {DotsecEncryptionEngineFactoryProps}
 */
export type DotsecEncryptionEngineFactoryProps = { verbose?: boolean };

/**
 * Type for plugin configuration
 * @date 12/7/2022 - 12:52:38 PM
 *
 * @export
 * @typedef {DotsecEncryptionEngine}
 * @template T = {}
 */
export type DotsecEncryptionEngine<T = Record<string, unknown>> = {
	encrypt(plaintext: string, ciphertext?: string): Promise<string>;
	decrypt(ciphertext: string): Promise<string>;
} & T;

/**
 * Type for plugin configuration
 * @deprecated
 * @date 12/7/2022 - 12:52:43 PM
 *
 * @export
 * @typedef {DotsecEncryptionEngineFactory}
 * @template T = {}
 * @template V extends Record<string, unknown> = {}
 */
export type DotsecEncryptionEngineFactory<
	T = Record<string, unknown>,
	V extends Record<string, unknown> = Record<string, unknown>,
> = {
	(options: DotsecEncryptionEngineFactoryProps & T): Promise<
		DotsecEncryptionEngine<V>
	>;
};
