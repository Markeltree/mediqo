const { HttpError } = require('./error');

/** Validates req.body (or query) against a zod schema and replaces it with the parsed data. */
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new HttpError(400, 'Validation failed', result.error.flatten().fieldErrors));
    }
    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
