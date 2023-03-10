# @dotsec/plugin-pke

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
npx dotsec pke create
```

## Encrypt a `.env` file to `.sec`

```sh
npx dotsec encrypt
```

## Decrypt a `.sec` file to`.env`

```sh
npx dotsec decrypt
```
