# dotsec

Like dotenv, but encrypted.

Encrypts your .env file with the AWS Encryption SDK so you can safely commit it to your repository.

## Features

- Encryption of .env files to .sec files.
- Decryption of .sec files to .env files.
- Run a command with the values of a .env file in its environment.
- Run a command with the values of a .sec file in its environment.
- Push selected .env/.sec entries to AWS Systems Manager Parameter Store.
- Push selected .env/.sec entries to AWS Secrets Manager.

## Requirements

- For initialisation enough credentials for creating a KMS key, and alias.
- For usage enough credentials for using the KMS key to encrypt and/or decrypt.
- An AWS KMS key with an alias.

## Usage

If you don't have an AWS KMS key with an alias, you can create one with the following command:

```sh
aws kms create-key --description "Dotsec key" --region eu-west-1
```

Take not of the `KeyMetadata.KeyId` value, and create an alias for it:

> Note: You are free to pick any allowed alias name.

```sh
aws kms create-alias --alias-name alias/dotsec --target-key-id <key-id>
```

### Execute a command and use the values of a .env file in its environment

Create a .env file if you don't have one already, and add some values:

```sh
echo "MY_FANCY_ENV_VAR='yes yes yallzies'\nHEY_HO='Let\'s go'" > .env
```

The following command will create an encrypted version of the `.env` file, and store it in a file called `.sec`. It will also create a config file called `dotsec.config.ts` which contains the KMS key alias, and AWS region. (Note: you don't have to add the key alias and region to the config file, you can also pass them as options to the dotsec aws sub command. See `dotsec init aws --help` for more information.)

```sh
npx dotsec init --aws-region eu-west-1 [--aws-key-alias alias/dotsec]
```

The following files will be created:

- `.sec` - The encrypted version of the `.env` file.
- `dotsec.config.ts` - The config file containing the KMS key alias and AWS region.

### Add files to Git

Add the `.sec` and `dotsec.config.ts` files to your repository, and commit these accordingly.

### Run a process with your .env file

```sh
npx dotsec run --env .env command env
```

### Run a process with your .sec file

```sh
npx dotsec run --sec .sec command env
```

For more options see `dotsec run --help`.

### Decrypt a .sec file to .env

```sh
npx dotsec decrypt
```

For more options see `dotsec decrypt --help`.

### Encrypt a .env file to .sec

```sh
npx dotsec encrypt
```

For more options see `dotsec encrypt --help`.

### Push selected .env/.sec entries to AWS Systems Manager Parameter Store

Take your favorite editor, and edit the `dotsec.config.ts` file. Add the following to the `aws` object:

```ts
{
    variables: {
        "NAME_OF_ENV_VAR_YOU_WANT_TO_PUSH": {
            push: {
                aws: {
                    ssm: true
                }
            }
        }
    }
}
```

> Take a look at the DotsecConfig type for more options on how to configure SSM pushes.

```sh
npx dotsec push --env --to-aws-ssm
```

### Push selected .env/.sec entries to AWS Secrets Manager

Take your favorite editor, and edit the `dotsec.config.ts` file. Add the following to the `aws` object:

```ts
{
    variables: {
        "NAME_OF_ENV_VAR_YOU_WANT_TO_PUSH": {
            push: {
                aws: {
                    secretsManager: true
                }
            }
        }
    }
}
```

> Take a look at the DotsecConfig type for more options on how to configure Secrets Manager pushes.

```sh
npx dotsec push --env --to-aws-secrets-manager
```

### FAQ

#### Is it safe to commit a `.sec` and `dotsec.config.ts` file alongside your code?

Yes it is. But it is up to you to make sure that access to the KMS key is restricted to the people who need to decrypt and/or encrypt the `.sec` file.

#### Should I use this in production?

We do, however, since this package is relatively new, I don't think you should.

## Roadmap

- [ ] Write some tests already.
- [ ] Add support in-code use like `dotsec.config()`
- [ ] Add support for Node preload modules like `node -r dotsec/register index.js`
- [ ] Add watcher for `.env` file changes and automatically encrypt
- [ ] Write guide on postinstall for npm/yarn/pnpm
- [ ] Add chunking for encoding larger files with assymetric keys. Current limit is 4kb.
- [ ] Add support for other encryption SDKs like GCP KMS, Azure Key Vault, etc.
- [ ] Split up dotsec package in multiple packages, one for each SDK.
- [x] Add support for pushing entries to AWS Systems Manager Parameter Store.
- [x] Add support for pulling entries to AWS Secrets Manager.
- [ ] Add support for pulling entries to GitHub actions secrets.

## Limitations

- The only supported encryption SDK is the AWS Encryption SDK. For now.
- Assymetric keys are supported, but the encrypted file size is limited to the payload size of the key. Until chunking is implemented, that is.
- AWS Secrets Manager secrets which are marked for deletion **cannot** be updated until the deletion is complete. As of writing, the minimum deletion time is 7 days. This means that if you want to update a deleted AWS Secrets Manager secret, you have to wait at least 7 days before you can update it again. This is a limitation of AWS Secrets Manager, not dotsec
