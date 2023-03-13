# How to use multiple .sec files in a monorepo

## Problem

You have a monorepo with one codebase for multiple environments, each having their own `.sec` file.

## Specify `SEC_FILE` value before running `dotsec`

```sh
SEC_FILE=.sec.test npx dotsec run --using sec {your command}
```

## Export `SEC_FILE` and `ENV_FILE` variables

```sh
export SEC_FILE=.sec.test
export ENV_FILE=.env.test
```

Validate if the variables are set correctly:

```sh
npx dotsec run --using sec env | grep -e SEC_FILE -e ENV_FILE
```

If the variables are set correctly, you should see the following output:

```sh
SEC_FILE=.sec.test
ENV_FILE=.env.test
```

After which you run your command:

```sh
npx dotsec run --using sec {your command}
```

## Adding the `SEC_FILE` and `ENV_FILE` variables to your `.zshenv` or `.bash_profile`

Add the following to your `.zshenv` or `.bash_profile`:

```sh
export SEC_FILE=.sec.test
export ENV_FILE=.env.test
```

Validate if the variables are set correctly:

```sh
npx dotsec run --using sec env | grep -e SEC_FILE -e ENV_FILE
```

If the variables are set correctly, you should see the following output:

```sh
SEC_FILE=.sec.test
ENV_FILE=.env.test
```

> If that did not work, try running `source ~/.zshenv` or `source ~/.bash_profile`

Then run the following command:

```sh
npx dotsec run --using sec {your command}
```
