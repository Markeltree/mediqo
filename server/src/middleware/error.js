class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const status = err.status || (err.name === 'ValidationError' ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    details: err.details,
  });
}

module.exports = { HttpError, notFound, errorHandler };
