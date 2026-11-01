// Tiny structured logger: one JSON object per line, easy to search in Render's log viewer
// or ship to a log service later. Level can be raised with LOG_LEVEL (error|warn|info|debug).
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function enabled(level) {
  const configured = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;
  return LEVELS[level] <= configured;
}

function write(level, msg, meta = {}) {
  if (!enabled(level)) return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...meta });
  (level === "error" || level === "warn" ? console.error : console.log)(line);
}

module.exports = {
  error: (msg, meta) => write("error", msg, meta),
  warn: (msg, meta) => write("warn", msg, meta),
  info: (msg, meta) => write("info", msg, meta),
  debug: (msg, meta) => write("debug", msg, meta),
};
