# @dotsec/plugin-aws

## Requirements

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- AWS credentials configured with the following permissions:
  - `kms:CreateKey`
  - `kms:CreateAlias`
  - `kms:Encrypt`
  - `kms:Decrypt`
  - `kms:DescribeKey`
  - `kms:ListAliases`
  - `kms:ListKeys`

- Permissions needed for SSM Parameter Store:
  - `ssm:GetParameter`
  - `ssm:GetParameters`
  - `ssm:PutParameter`
  - `ssm:DeleteParameter`

- Permissions needed for Secrets Manager:
  - `secretsmanager:CreateSecret`
  - `secretsmanager:DeleteSecret`
  - `secretsmanager:GetSecretValue`
  - `secretsmanager:ListSecrets`
  - `secretsmanager:PutSecretValue`

TODO: validate permissions

## Installation

```sh
npm install dotsec @dotsec/plugin-aws
```

## Create `dotsec.config.ts`

```sh
npx dotsec --plugin @dotsec/plugin-aws aws init
```

## Create a KMS key and alias

If you don't have an AWS KMS key with an alias, you can create one with the following command:

```sh
aws kms create-key --description "Dotsec key" --region eu-west-1
```

Take not of the `KeyMetadata.KeyId` value, and create an alias for it:

> Note: You are free to pick any allowed alias name, just make sure to specify the alias in one of the following:
>
> - `dotsec.config.ts` > `defaults.plugins.aws.kms.keyAlias`
> - `--aws-key-alias` option
> - `AWS_KMS_KEY_ALIAS` environment variable

```sh
aws kms create-alias --alias-name alias/dotsec --target-key-id <key-id>
```

## Encrypt a `.env` file to `.sec`

```sh
npx dotsec encrypt
```

## Decrypt a `.sec` file to`.env`

```sh
npx dotsec decrypt
```

## Commands

### init
  
```sh
npx dotsec --plugin @dotsec/plugin-aws aws init
```
