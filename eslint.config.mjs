import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  // eslint-plugin-react's version detection calls an API ESLint 10 removed.
  { settings: { react: { version: "19.3" } } },
  { ignores: [".next/**", "out/**", "node_modules/**", ".impeccable/**", "next-env.d.ts"] },
];

export default config;
