import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
	{
		...tseslint.configs.base,
		files: ["./src/**/*.ts", "./src/**/*.tsx"],
		rules: {
			// Note: you must disable the base rule as it can report incorrect errors
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					args: "none",
					caughtErrors: "none",
					ignoreRestSiblings: true,
				},
			],
		},
	},
]);
