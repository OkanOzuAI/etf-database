import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // eslint-config-next'in varsayılan olarak yok saydıkları:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Python sanal ortamı (içinde Jupyter'ın JavaScript dosyaları var):
    ".venv/**",
  ]),
]);

export default eslintConfig;
