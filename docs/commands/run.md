# run

> Without encryption plugins this command will only inject .env variables into the environment.
> If you want to use encryption plugins, you need to install them first, please see the [plugins](../plugins/README.md) section for more information.

```sh
## Without encryption plugins

```sh
npx dotsec run --using env {your command}
```

## With encryption plugins

Run a command with a `.sec` file

```sh
npx dotsec run --using sec {your command}
```

If you'd like to specify a specific `.sec` file, you can use the `--sec-file` option

```sh
npx dotsec run --using sec --sec-file .sec {your command}
```

or, you can specify the `SEC_FILE` environment variable

```sh
SEC_FILE=.sec npx dotsec run --using sec {your command}
```

## Without encryption plugins

Run a command with a `.env` file

```sh
npx dotsec run --using env node -e \"console.log(process.env)\"
```

Run a command with a specific `.env` file

```sh
$ npx dotsec run --using env --env-file .env node -e \"console.log(process.env)\"
```

Run a command with a specific `ENV_FILE` variable

```sh
ENV_FILE=.env.dev npx dotsec run --using env node -e \"console.log(process.env)\"
```

```sh
You can also specify 'using' as an environment variable

```sh
DOTSEC_USING=env npx dotsec run node -e \"console.log(process.env)\"
```

## Config file

See the [config file](../reference/config.md) reference for more information on how to configure this command.
