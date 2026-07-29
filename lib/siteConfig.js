export function getSiteConfig(req) {
  const rawHost =
    req?.headers?.host ||
    process.env.VERCEL_URL ||
    process.env.APP_HOSTNAME ||
    process.env.NEXT_PUBLIC_APP_HOSTNAME ||
    "localhost:3000";

  const normalizedHost = String(rawHost).replace(/https?:\/\//, "").split(":")[0];
  const explicitSubdomain = process.env.APP_SUBDOMAIN || process.env.NEXT_PUBLIC_APP_SUBDOMAIN || "";

  let subdomain = explicitSubdomain;
  if (!subdomain) {
    const hostParts = normalizedHost.split(".");
    if (hostParts.length > 2 && normalizedHost !== "localhost") {
      subdomain = hostParts[0];
    }
  }

  const baseUrl = process.env.APP_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  return {
    hostname: normalizedHost,
    subdomain,
    baseUrl,
    isVercel: Boolean(process.env.VERCEL_URL || process.env.VERCEL),
  };
}
