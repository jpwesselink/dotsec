export type DotSecLiteral = string | number | boolean;
export type DotSecCommonProps = { __dotsec_halt__?: true };
export type EncryptedValueObject = { encryptedValue: string };
export type PlainTextValueObject = { value: DotSecLiteral };
export type IsFlat = true;
export type IsTree = false;
export type Not<T extends { [key: string]: unknown }> = {
    [P in keyof T]?: never;
};

export type Encrypted = 'encrypted';
export type PlainText = 'plainText';
