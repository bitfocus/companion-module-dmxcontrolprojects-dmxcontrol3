/* eslint-dev node */
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/strict-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "prettier"
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname
  },
  root: true,
  ignorePatterns: [
    "node_modules",
    "dist",
    "src/generated",
    ".eslintrc.cjs",
    ".prettierrc"
  ],
  env: {
    node: true
  }
};
