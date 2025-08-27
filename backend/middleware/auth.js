const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const config = require("../config/config");

// Middleware d'authentification
const auth = (req, res, next) => {
  try {
    // Récupérer le token du header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn(`Tentative d'accès à une route protégée sans token valide`);
      return res.status(401).json({ error: "Authentification requise" });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Vérifier le token
    const decodedToken = jwt.verify(token, config.JWT_SECRET);
    
    // Ajouter les informations utilisateur à l'objet requête
    req.user = {
      userId: decodedToken.userId,
      username: decodedToken.username,
      role: decodedToken.role
    };
    
    logger.debug(`Utilisateur authentifié: ${req.user.username} (ID: ${req.user.userId}, Rôle: ${req.user.role})`);
    next();
  } catch (error) {
    logger.error(`Erreur d'authentification: ${error.message}`);
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
};

// Middleware pour vérifier le rôle admin
const isAdmin = (req, res, next) => {
  // Ce middleware doit être utilisé après le middleware auth
  if (!req.user) {
    logger.error("Middleware isAdmin utilisé sans middleware auth préalable");
    return res.status(500).json({ error: "Erreur de configuration serveur" });
  }
  
  if (req.user.role !== 'admin') {
    logger.warn(`Tentative d'accès à une route admin par un utilisateur non-admin: ${req.user.username}`);
    return res.status(403).json({ error: "Accès refusé. Privilèges administrateur requis." });
  }
  
  logger.debug(`Accès admin autorisé pour: ${req.user.username}`);
  next();
};

module.exports = {
  auth,
  isAdmin
};
