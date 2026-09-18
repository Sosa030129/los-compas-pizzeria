import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sin output: "standalone" — usamos next start que incluye todos los node_modules
  // FASE 1.5: Re-enabled TS errors para que el build falle si hay errores de tipos.
  // Antes: typescript.ignoreBuildErrors = true escondía bugs reales.
  reactStrictMode: false,
};

export default nextConfig;
