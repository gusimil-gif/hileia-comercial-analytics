export const ENV = {
  appId: process.env.VITE_APP_ID ?? process.env.EXTERNAL_APP_ID ?? "hileia-external",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  externalAuth: process.env.EXTERNAL_AUTH === "true",
  externalAdminEmail: process.env.EXTERNAL_ADMIN_EMAIL ?? "",
  externalAdminPassword: process.env.EXTERNAL_ADMIN_PASSWORD ?? "",
  externalAdminName: process.env.EXTERNAL_ADMIN_NAME ?? "Administrador",
};
