const { defineConfig, globalIgnores } = require("eslint/config");

const tsParser = require("@typescript-eslint/parser");
const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const globals = require("globals");
const js = require("@eslint/js");

const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = defineConfig([
    {
        extends: compat.extends(
            "eslint:recommended",
            "plugin:@typescript-eslint/strict-type-checked",
            "plugin:@typescript-eslint/stylistic-type-checked",
            "prettier"
        ),

        languageOptions: {
            parser: tsParser,

            parserOptions: {
                project: true,
                tsconfigRootDir: __dirname
            },

            globals: {
                ...globals.node
            }
        },

        plugins: {
            "@typescript-eslint": typescriptEslint
        },

        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    args: "all",
                    argsIgnorePattern: "^_",
                    caughtErrors: "all",
                    caughtErrorsIgnorePattern: "^_",
                    destructuredArrayIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    ignoreRestSiblings: true
                }
            ],
            "@typescript-eslint/restrict-template-expressions": "off"
        }
    },
    globalIgnores([
        "**/node_modules",
        "**/dist",
        "**/pkg",
        "**/eslint.config.cjs",
        "**/.prettierrc"
    ])
]);
