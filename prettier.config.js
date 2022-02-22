module.exports = {
    endOfLine: 'auto',
    singleQuote: true,
    trailingComma: 'all',
    overrides: [
        {
            files: '.editorconfig',
            options: { parser: 'yaml' },
        },
        {
            files: 'LICENSE',
            options: { parser: 'markdown' },
        },
    ],
};
