module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.json'],
    },
    ignorePatterns: ['node_modules/**', '.storybook/**', 'generators/app/templates/**', '!.eslintrc.js'],
    plugins: ['import', 'prettier', 'unused-imports', '@typescript-eslint'],
    env: {
        browser: true,
        es6: true,
        node: true,
        jest: true,
    },
    overrides: [
        {
            files: ['*.ts'],
            extends: [
                'airbnb-typescript/base',
                'plugin:@typescript-eslint/recommended',
                'plugin:@typescript-eslint/recommended-requiring-type-checking',
                'plugin:import/typescript',
                'prettier',
            ],
        },
        {
            files: ['*.js'],
            parser: 'espree',
            extends: ['plugin:import/recommended', 'prettier'],
        },
        {
            files: '*.eslintrc.js',
            rules: {
                'global-require': 'off',
            },
        },
    ],
    rules: {
        'no-console': 'warn',
        'no-use-before-define': 'off',
        'no-shadow': 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/explicit-member-accessibility': 'off',
        '@typescript-eslint/no-object-literal-type-assertion': 'off',
        '@typescript-eslint/no-use-before-define': 'error',
        '@typescript-eslint/no-shadow': 'error',
        '@typescript-eslint/no-empty-function': 'off',
        'import/no-cycle': 'warn',
        'import/no-unresolved': 'error',
        'import/prefer-default-export': 'off',
        'import/no-extraneous-dependencies': [
            'error',
            {
                devDependencies: ['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js', 'setupTest.ts'],
            },
        ],
        'import/order': [
            'error',
            {
                alphabetize: {
                    caseInsensitive: true,
                    order: 'asc',
                },
                groups: ['builtin', 'external', 'internal'],
                'newlines-between': 'always',
                pathGroups: [
                    {
                        group: 'builtin',
                        pattern: 'react',
                        position: 'before',
                    },
                    {
                        group: 'builtin',
                        pattern: 'aws*',
                        position: 'before',
                    },
                    {
                        group: 'builtin',
                        pattern: '@dazn*',
                        position: 'before',
                    },
                ],
                pathGroupsExcludedImportTypes: ['react', 'aws*', '@dazn*'],
            },
        ],
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': [
            'warn',
            {
                vars: 'all',
                varsIgnorePattern: '^_',
                args: 'after-used',
                argsIgnorePattern: '^_',
            },
        ],
        'prettier/prettier': ['error', { ...require('./prettier.config') }],
    },
};
