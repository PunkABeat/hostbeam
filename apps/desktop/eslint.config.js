import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

const reactHookRules = {
  "react-hooks/rules-of-hooks": "error",
  "react-hooks/exhaustive-deps": "warn",
};

export default tseslint.config(
  { ignores: ["dist", "node_modules", "src-tauri", "*.config.*"] },

  // Typed app glue: strict.
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: { "react-hooks": reactHooks },
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      ...reactHookRules,
    },
  },

  // The layering rule (docs/engineering/architecture.md): a view reaches Rust
  // and the config through lib/, never through the bridge the entry points own;
  // and lib/ knows nothing about screens.
  {
    files: ["src/views/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/config-bridge"],
              message: "Views use lib/config (useHBConfig) and lib/config-sync, not the bridge.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/lib/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["**/views/**"], message: "lib/ and hooks/ must not depend on a screen." },
          ],
        },
      ],
    },
  },

  // Ambient declaration files: don't flag imports used only in type space.
  {
    files: ["**/*.d.ts"],
    rules: { "@typescript-eslint/no-unused-vars": "off" },
  },
);
