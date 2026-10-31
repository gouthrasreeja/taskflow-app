const ApiError = require("./ApiError");
const escapeRegex = require("./escapeRegex");
const { VALID_STATUSES, MAX_SEARCH_LENGTH } = require("./constants");

// Turns untrusted query-string input into a safe MongoDB filter scoped to one user.
// Express parses ?status[$ne]=x into an object, so every value's TYPE must be checked,
// not just its content.
function buildTaskFilter(query, userId) {
  const { status, search } = query;
  const filter = { userId };

  if (status !== undefined) {
    if (typeof status !== "string" || !VALID_STATUSES.includes(status)) {
      throw new ApiError(400, `Status must be one of: ${VALID_STATUSES.join(", ")}`);
    }
    filter.status = status;
  }

  if (search !== undefined && search !== "") {
    if (typeof search !== "string" || search.length > MAX_SEARCH_LENGTH) {
      throw new ApiError(400, `Search must be text of at most ${MAX_SEARCH_LENGTH} characters`);
    }
    filter.title = { $regex: escapeRegex(search), $options: "i" };
  }

  return filter;
}

module.exports = { buildTaskFilter };
