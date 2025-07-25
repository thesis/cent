/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: [
    "@thesis-co"
  ],
  ignorePatterns: [
    "node_modules",
    "**/node_modules/**",
    "**/**/node_modules/**",
    "dist",
    ".next",
    "build",
    "coverage",
    ".eslintrc.js",
    "**/.eslintrc.js",
    "**/*.eslintrc.js",
    "**/jest.config.js",
    "**/babel.config.js"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.eslint.json",
  },
  rules: {
    "import/prefer-default-export": "off",
    "import/no-cycle": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "react/react-in-jsx-scope": "off",
    "react/jsx-props-no-spreading": "off",
    "react/button-has-type": "warn",
    "no-console": "warn"
  }
};