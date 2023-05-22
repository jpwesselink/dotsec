export const ssmAvailableCases = [
	"camelCase",
	"capitalCase",
	"constantCase",
	"dotCase",
	"headerCase",
	"noCase",
	"paramCase",
	"pascalCase",
	"pathCase",
	"sentenceCase",
	"snakeCase",
] as const;
export const secretsManagerAvailableCases = [
	"camelCase",
	"constantCase",
	"dotCase",
	"headerCase",
	"noCase",
	"paramCase",
	"pascalCase",
	"pathCase",
	"snakeCase",
] as const;

export type SsmAvailableCases = typeof ssmAvailableCases[number];
export type SecretsManagerAvailableCases =
	typeof secretsManagerAvailableCases[number];
