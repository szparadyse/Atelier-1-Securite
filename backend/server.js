const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const logger = require("./utils/logger");
const config = require("./config/config");
const { initDatabase } = require("./models/db");
const { notFoundHandler, errorHandler } = require("./middleware/error");
const { registerValidators } = require("./middleware/validators");

// Routes
const authRoutes = require("./routes/auth");
const offerRoutes = require("./routes/offers");
const adminRoutes = require("./routes/admin");
const testRoutes = require("./routes/test");

// Initialisation de l'application Express
const app = express();

// Middleware
app.use(cors(config.CORS));
app.use(express.json({ limit: config.REQUEST_LIMITS.json })); // Limiter la taille des requêtes JSON
app.use(express.urlencoded({ extended: true, limit: config.REQUEST_LIMITS.urlencoded })); // Pour parser les données des formulaires
app.use(cookieParser()); // Pour parser les cookies
app.use(helmet()); // Ajouter des en-têtes de sécurité

// Définition des routes
app.use("/api/auth", authRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", testRoutes);

// Routes de compatibilité pour maintenir les anciens points d'entrée
app.post("/api/login", (req, res) => {
  logger.info("Utilisation de l'ancienne route /api/login, redirection vers /api/auth/login");
  // Rediriger la requête vers la nouvelle route
  res.redirect(307, "/api/auth/login");
});

app.post("/api/register", (req, res) => {
  logger.info("Utilisation de l'ancienne route /api/register, redirection vers /api/auth/register");
  // Rediriger la requête vers la nouvelle route
  res.redirect(307, "/api/auth/register");
});

// Route de compatibilité pour les offres de l'utilisateur
app.get("/api/my-offers", (req, res, next) => {
  logger.info("Utilisation de l'ancienne route /api/my-offers, redirection vers /api/offers/my-offers");
  
  // Cette route nécessite une authentification, donc nous devons importer et appliquer le middleware auth
  const { auth } = require("./middleware/auth");
  
  // Appliquer le middleware d'authentification avant de rediriger
  auth(req, res, () => {
    res.redirect(307, "/api/offers/my-offers");
  });
});

// Middleware pour gérer les erreurs 404 (routes non trouvées)
app.use(notFoundHandler);

// Middleware pour gérer les autres erreurs
app.use(errorHandler);

// Initialisation de la base de données puis démarrage du serveur
initDatabase()
  .then(() => {
    // Lancer le serveur
    app.listen(config.PORT, () => {
      logger.critical(`🚀 Application lancée ! Backend démarré sur http://localhost:${config.PORT}`);
    });
  })
  .catch(error => {
    logger.critical(`Impossible de démarrer le serveur: ${error.message}`);
    process.exit(1);
  });
