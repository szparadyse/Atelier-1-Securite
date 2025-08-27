const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");
const csrf = require("csurf");
const config = require("../config/config");

// Configuration du CSRF
const csrfProtection = csrf({ 
  cookie: config.CSRF_COOKIE
});

// Route pour tester la gestion d'erreur (génère une erreur 500)
router.get("/test-error", (req, res, next) => {
  logger.debug("Requête GET /api/test-error reçue (test d'erreur)");
  try {
    // Générer une erreur intentionnellement
    throw new Error("Ceci est une erreur de test");
  } catch (error) {
    next(error); // Transmet l'erreur au middleware de gestion d'erreurs
  }
});

// Route pour obtenir un token CSRF
router.get("/csrf-token", csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

module.exports = router;
