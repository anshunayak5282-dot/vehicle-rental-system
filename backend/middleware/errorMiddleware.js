// Centralized error handling middleware
function errorHandler(err, req, res, next) {
  console.error('Unhandled Server Error:', err);

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = errorHandler;
