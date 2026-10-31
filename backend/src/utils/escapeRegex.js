// Escapes regex metacharacters so user input is matched as literal text.
module.exports = function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
