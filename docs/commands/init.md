# init

## Usage

Create a dotsec.config.ts file in the current directory

```sh
npx dotsec init
```

Overwrite an existing dotsec.config.ts file in the current directory

```sh
npx dotsec init --yes
```

Create a dotsec config file in the current directory with a specific config file name

By specifying the --config-file option, you can create a dotsec config file with a specific name.

```sh
npx dotsec init --config-file dotsec.config.ts
```

```sh
DOTSEC_CONFIG_FILE=my.config.ts npx dotsec init
```
