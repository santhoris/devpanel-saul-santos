/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 es un modulo nativo: debe quedar fuera del bundle de servidor.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
