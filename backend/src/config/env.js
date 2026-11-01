// Validates configuration at startup so a bad deployment fails immediately with a clear
// message instead of misbehaving later (e.g. every login failing because JWT_SECRET is empty).

// "https://a.com, https://b.com " -> ["https://a.com", "https://b.com"]
function parseOrigins(value) {
  if (!value) return [];
  return value.split(",").map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean);
}

function validateEnv(env) {
  const errors = [];
  const warnings = [];
  const production = env.NODE_ENV === "production";

  if (!env.MONGO_URI) errors.push("MONGO_URI is required");

  if (!env.JWT_SECRET) {
    errors.push("JWT_SECRET is required");
  } else if (production && env.JWT_SECRET.length < 32) {
    errors.push("JWT_SECRET must be at least 32 characters in production");
  } else if (/replace_this|changeme|secret$/i.test(env.JWT_SECRET)) {
    (production ? errors : warnings).push("JWT_SECRET looks like a placeholder value");
  }

  const origins = parseOrigins(env.CLIENT_ORIGIN);
  if (production) {
    if (origins.length === 0) errors.push("CLIENT_ORIGIN is required in production (the deployed front-end URL)");
    if (origins.includes("*")) errors.push("CLIENT_ORIGIN must not be '*' in production");
    origins.forEach((o) => {
      if (!/^https:\/\//.test(o) && !/^http:\/\/localhost(:\d+)?$/.test(o)) {
        warnings.push(`CLIENT_ORIGIN entry '${o}' is not https`);
      }
    });
  }

  const port = Number(env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push("PORT must be a valid port number");

  return { ok: errors.length === 0, errors, warnings, origins, port };
}

module.exports = { validateEnv, parseOrigins };
