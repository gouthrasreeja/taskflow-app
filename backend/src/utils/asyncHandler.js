// Avoids repeating try/catch in every controller: any rejected promise
// or thrown error inside `fn` is forwarded to Express's error handler.
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
