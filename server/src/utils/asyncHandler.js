/**
 * Express 4 does not automatically catch errors thrown inside an async
 * function, which would crash the Node process on the first bad request.
 * Wrapping every controller in this helper forwards rejected promises to
 * next(), so the centralized error middleware can send a proper JSON error.
 *
 *   router.post('/buy', asyncHandler(buy));
 */
export function asyncHandler(fn) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default asyncHandler;
