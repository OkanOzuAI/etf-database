import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // The folders and files that eslint-config-next ignores by default:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The Python virtual environment (it contains Jupyter's JavaScript files):
    ".venv/**",
  ]),
]);

export default eslintConfig;
