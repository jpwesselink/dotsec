dotsec-monorepo

# dotsec-monorepo

## Table of contents

### References

- [DotsecConfig](README.md#dotsecconfig)

### Type Aliases

- [Dotsec](README.md#dotsec)

### Variables

- [default](README.md#default)

## References

### DotsecConfig

Renames and re-exports [Dotsec](README.md#dotsec)

## Type Aliases

### Dotsec

Ƭ **Dotsec**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `config?` | { `aws?`: { `kms?`: { `encryptionAlgorithm?`: ``"RSAES_OAEP_SHA_1"`` \| ``"RSAES_OAEP_SHA_256"`` \| ``"SYMMETRIC_DEFAULT"`` ; `keyAlias?`: `string`  } ; `region?`: `string` ; `secretsManager?`: { `pathPrefix?`: `string`  } ; `ssm?`: { `parameterType?`: ``"String"`` \| ``"SecureString"`` ; `pathPrefix?`: `string`  }  }  } |
| `config.aws?` | { `kms?`: { `encryptionAlgorithm?`: ``"RSAES_OAEP_SHA_1"`` \| ``"RSAES_OAEP_SHA_256"`` \| ``"SYMMETRIC_DEFAULT"`` ; `keyAlias?`: `string`  } ; `region?`: `string` ; `secretsManager?`: { `pathPrefix?`: `string`  } ; `ssm?`: { `parameterType?`: ``"String"`` \| ``"SecureString"`` ; `pathPrefix?`: `string`  }  } |
| `config.aws.kms?` | { `encryptionAlgorithm?`: ``"RSAES_OAEP_SHA_1"`` \| ``"RSAES_OAEP_SHA_256"`` \| ``"SYMMETRIC_DEFAULT"`` ; `keyAlias?`: `string`  } |
| `config.aws.kms.encryptionAlgorithm?` | ``"RSAES_OAEP_SHA_1"`` \| ``"RSAES_OAEP_SHA_256"`` \| ``"SYMMETRIC_DEFAULT"`` |
| `config.aws.kms.keyAlias?` | `string` |
| `config.aws.region?` | `string` |
| `config.aws.secretsManager?` | { `pathPrefix?`: `string`  } |
| `config.aws.secretsManager.pathPrefix?` | `string` |
| `config.aws.ssm?` | { `parameterType?`: ``"String"`` \| ``"SecureString"`` ; `pathPrefix?`: `string`  } |
| `config.aws.ssm.parameterType?` | ``"String"`` \| ``"SecureString"`` |
| `config.aws.ssm.pathPrefix?` | `string` |
| `variables?` | { `[key: string]`: { `push?`: { `aws?`: { `secretsManager?`: `boolean` ; `ssm?`: `boolean` \| `Omit`<`PutParameterRequest`, ``"Name"`` \| ``"Value"``\> & { `Name?`: `string`  }  }  }  };  } |

#### Defined in

[types.ts:32](https://github.com/jpwesselink/dotsec/blob/main/packages/dotsec/src/types.ts#L32)

## Variables

### default

• `Const` **default**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `config` | (`options`: `Object`) => `Promise`<`void`\> |

#### Defined in

[dotsec.ts:91](https://github.com/jpwesselink/dotsec/blob/main/packages/dotsec/src/dotsec.ts#L91)
