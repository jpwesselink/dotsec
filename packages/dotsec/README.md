# dotsec

Secure dot env. Encrypts your .env so you can safely store it in your project.

## Usage

### Execute a command and use the values of a .env file in its environment

```sh
npx dotsec --env-file .env {command}
```

This command also supports injecting AWS assumed role credentials into the process environment.

You can specify the ARN of the role to assume in three ways:

- By adding the `--aws-assume-role-arn` flag
- By setting the `AWS_ASSUME_ROLE_ARN` environment variable
- By adding the `AWS_ASSUME_ROLE_ARN` environment variable to your target `.env` file

#### By adding the `--aws-assume-role-arn` flag

```sh
npx dotsec --env-file .env --aws-assume-role-arn arn:aws:iam::123456789012:role/special-role {command}
```

#### By setting the `AWS_ASSUME_ROLE_ARN` environment variable

```sh
AWS_ASSUME_ROLE_ARN=arn:aws:iam::123456789012:role/special-role npx dotsec --env-file .env {command}
```

#### By adding the `AWS_ASSUME_ROLE_ARN` environment variable to your target `.env` file

...
AWS_ASSUME_ROLE_ARN=arn:aws:iam::123456789012:role/special-role
...

```sh
npx dotsec --env-file .env {command}
```

Please refer to `dotsec help` for more information on other command line options.

#### Secure usage

Create a user managed AWS KMS key, add an alias. Refer to the AWS documentation for [creating keys](https://docs.aws.amazon.com/kms/latest/developerguide/create-keys.html) and [managing aliases](https://docs.aws.amazon.com/kms/latest/developerguide/alias-manage.html#alias-create)

> the default key alias is set to `alias/top-secret`

### Execute a command and use the decrypted values of a .sec file in its environment

```sh
npx dotsec {command}
```

#### Other commands

### Encrypting a `.env` file into a `.sec` file

```sh
npx dotsec encrypt-env
```

### Decrypting a `.sec` file into a `.env` file

```sh
npx dotsec decrypt-env
```

### Using a `.sec` file as environment variables

```sh
npx dotsec node index.js
```

## Using json secrets

### Encrypting a `secrets.json` file into a `secrets.encrypted.json` file

```sh
npx dotsec encrypt-secrets-json
```

### Decrypting a `secrets.encrypted.json` file into a `secrets.json` file

```sh
npx dotsec decrypt-secrets-json
```

### Offload a `secrets.encrypted.json` file to SSM

```sh
npx dotsec offload-secrets-json-to-ssm
```

### FAQ

#### Is it safe to commit a `.sec` file alongside your code?

Yes it is. The encryption key is managed by AWS, as long as you audit which principals can encrypt and decrypt you're good.

#### Should I use this in production?

We do, however, since this package is relatively new, I don't think you should.
