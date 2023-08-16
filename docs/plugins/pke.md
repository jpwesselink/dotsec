# @dotsec/plugin-pke

This plugin provides public key encryption (PKE) for the `dotsec` CLI.

## How it works

We will encrypt our `.env` file with a public key. The encrypted file will be saved as `.sec`.
We can then decrypt the `.sec` file with a private key. The decrypted file will be saved as `.env`.

Since the `.env` file will be encrypted with a public key, you can share it with anyone who has the private key. This is useful for sharing secrets with a CI/CD pipeline. You can also use the private key to decrypt the `.sec` file locally. In other words, it is safe to commit the `.sec` file to your repository, together with the public key. However, you should never commit the `.env` file to your repository, nor the private key.

## Installation

```sh
npm install dotsec @dotsec/plugin-pke
```

## Create `dotsec.config.ts`

```sh
npx dotsec --plugin @dotsec/plugin-pke pke init
```

## Create a keypair

```sh
npx dotsec pke create-keypair
```

## Add `.env` and `dotsec-private.pem` to `.gitignore`

```sh
echo '.env' >> .gitignore
echo 'dotsec-private.pem' >> .gitignore
```

## Encrypt a `.env` file to `.sec`

```sh
npx dotsec encrypt
```

## Decrypt a `.sec` file to`.env`

```sh
npx dotsec decrypt
```
