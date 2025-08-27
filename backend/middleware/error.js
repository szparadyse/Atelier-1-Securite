const logger = require("../utils/logger");

// Middleware pour gérer les erreurs 404 (routes non trouvées)
const notFoundHandler = (req, res, next) => {
  logger.warn(`404 - Route non trouvée: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: 404,
    message: "Route non trouvée",
    path: req.originalUrl
  });
};

// Middleware pour gérer les autres erreurs
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorMessage = err.message || "Erreur interne du serveur";
  
  if (statusCode === 500) {
    logger.error(`500 - Erreur serveur: ${errorMessage}`);
    logger.error(`Stack: ${err.stack}`);
  } else {
    logger.warn(`${statusCode} - ${errorMessage} - ${req.method} ${req.originalUrl}`);
  }
  
  res.status(statusCode).json({
    status: statusCode,
    message: errorMessage
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
