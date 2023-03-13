# encrypt

## Usage

Encrypts a plaintext env file to an encrypted sec file

```sh
npx dotsec decrypt

Specify a different plaintext env file

```sh
npx dotsec encrypt --env-file .env.dev
ENV_FILE=.env.dev npx dotsec encrypt
```

Specify a different encrypt sec file

```sh
npx dotsec encrypt --sec-file .sec.dev
SEC_FILE=.sec.dev npx dotsec encrypt
```

Write a manifest file

```sh
npx dotsec encrypt --create-manifest
CREATE_MANIFEST=true npx dotsec encrypt
```

Specify a different manifest file

```sh
npx dotsec encrypt --manifest-file manifest.dev
MANIFEST_FILE=encryption-manifest.md npx dotsec encrypt
```

## Config file

See the [config file](../reference/config.md) reference for more information on how to configure this command.
