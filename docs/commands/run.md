# run

> Without encryption plugins this command will only inject .env variables into the environment.
> If you want to use encryption plugins, you need to install them first, please see the [plugins](../plugins/README.md) section for more information.

````sh
## Without encryption plugins

```sh
npx dotsec run --using env {your command}
````

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
npx dotsec run --using env --env-file .env node -e \"console.log(process.env)\"
```

Run a command with a specific `ENV_FILE` variable

```sh
ENV_FILE=.env.dev npx dotsec run --using env node -e \"console.log(process.env)\"
```

````sh
You can also specify 'using' as an environment variable

```sh
DOTSEC_USING=env npx dotsec run node -e \"console.log(process.env)\"
````

## Output options

### Redaction

By default - and by safety design - the output of the command will not be redacted. This means that during `run`, the values of your env vars will replaced by asterisks (`*`) in the output. This will prevent your secrets from leaking into logs or other output channels.

However, you can make exceptions for specific variables by adding env var names to the `redaction.show` array will prevent them from being redacted if redaction is enabled.

### Show output background color

If you'd like to highlight the output of the `run` to signal that its `env` or `sec` variables are injected, you can do so in a couple of ways:

- On the command line using the `--show-output-background-color` flag
- By setting the `DOTSEC_SHOW_OUTPUT_BACKGROUND_COLOR` environment variable to `true`
- By setting the `defaults.options.showOutputBackgroundColor` config option to `true`

#### Using the `--show-output-background-color` flag

```sh
npx dotsec run --show-output-background-color {your command}
```

#### Using the `DOTSEC_SHOW_OUTPUT_BACKGROUND_COLOR` environment variable

```sh
DOTSEC_SHOW_OUTPUT_BACKGROUND_COLOR=true npx dotsec run {your command}
```

#### Using the `defaults.options.showOutputBackgroundColor` config option

```ts
{
  defaults: {
    options: {
      showOutputBackgroundColor: true;
    }
  }
}
```

### Use a custom output background color

By default, the background color is set to `red-bright`, however, the following colors from the excellent [chalk](https://www.npmjs.com/package/chalk) package are supported:

- black
- red
- green
- yellow
- blue
- magenta
- cyan
- white
- black-bright, (alias: gray, grey)
- red-bright
- green-bright
- yellow-bright
- blue-bright
- magenta-bright
- cyan-bright
- white-bright

Setting a different background color can be achieved in a couple of ways:

- On the command line using the `--output-background-color` flag
- By setting the `DOTSEC_OUTPUT_BACKGROUND_COLOR` environment variable to a supported color
- By setting the `defaults.options.outputBackgroundColor` config option to a supported color

#### Using the `--output-background-color` flag

```sh
npx dotsec run --output-background-color blue {your command}
```

#### Using the `DOTSEC_OUTPUT_BACKGROUND_COLOR` environment variable

```sh
DOTSEC_OUTPUT_BACKGROUND_COLOR=blue npx dotsec run {your command}
```

#### Using the `defaults.options.outputBackgroundColor` config option

```ts
{
  defaults: {
    options: {
      outputBackgroundColor: "blue";
    }
  }
}
```

## Config file

See the [config file](../reference/config.md) reference for more information on how to configure this command.
