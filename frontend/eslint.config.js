const js = require("@eslint/js");
const globals = require("globals");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  { ignores: ["dist/**", "dist-admin/**", "eslint.config.js", "postcss.config.js"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-empty": ["error", { "allowEmptyCatch": true }],
    },
  },
);
