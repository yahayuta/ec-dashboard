import next from "eslint-config-next";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  ...next,
  ...nextTypeScript,
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
];

export default config;
