// Charger les variables d'environnement
require('dotenv').config({ path: '../.env' });

// Configuration de l'application
module.exports = {
  // Port du serveur
  PORT: process.env.PORT || 3000,
  
  // Configuration de la base de données
  DATABASE: {
    path: process.env.DB_PATH || "./database.db"
  },
  
  // Clé secrète pour les JWT
  JWT_SECRET: process.env.JWT_SECRET || "secret_par_defaut_pour_dev_uniquement",
  
  // Configuration CORS
  CORS: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true
  },
  
  // Configuration des limites de requêtes
  REQUEST_LIMITS: {
    json: "1mb",
    urlencoded: "1mb"
  },
  
  // Durée de validité du token JWT
  JWT_EXPIRATION: process.env.JWT_EXPIRATION || "24h",
  
  // Configuration des cookies CSRF
  CSRF_COOKIE: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  }
};
