const express = require("express");
const router = express.Router();
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const { db } = require("../models/db");
const logger = require("../utils/logger");
const config = require("../config/config");
const { auth } = require("../middleware/auth");
const { registerValidators } = require("../middleware/validators");
const authUtils = require("../utils/auth");

// Route pour l'inscription utilisateur
router.post("/register", registerValidators, (req, res) => {
  // Vérification des erreurs de validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Extraction des messages d'erreur
    const errorMessages = errors.array();
    const passwordErrors = errorMessages
      .filter(err => ["password", "confirmPassword"].includes(err.path))
      .map(err => err.msg);
    
    // Erreur principale (premier message ou message générique)
    const mainError = errorMessages.length > 0 ? 
      errorMessages[0].msg : 
      "Données d'inscription invalides";
    
    logger.warn(`Tentative d'inscription échouée: validation échouée pour ${req.body.username || 'utilisateur inconnu'}`);
    return res.status(400).json({ 
      error: mainError, 
      passwordErrors: passwordErrors.length > 0 ? passwordErrors : undefined 
    });
  }
  
  const { username, email, password } = req.body;
  logger.info(`Tentative d'inscription pour l'utilisateur: ${username}`);
  
  // Hashage du mot de passe
  const hashedPassword = authUtils.hashPassword(password);
  
  // Vérification que l'username et l'email n'existent pas déjà avec des requêtes paramétrées
  db.get("SELECT id FROM users WHERE username = ? OR email = ?", [username, email], (err, user) => {
    if (err) {
      logger.error(`Erreur lors de la vérification des identifiants: ${err.message}`);
      return res.status(500).json({ error: "Erreur serveur lors de l'inscription" });
    }
    
    if (user) {
      // Vérification plus précise pour donner un message d'erreur plus spécifique
      db.get("SELECT id FROM users WHERE username = ?", [username], (err, usernameExists) => {
        if (err) {
          logger.error(`Erreur lors de la vérification du nom d'utilisateur: ${err.message}`);
          return res.status(500).json({ error: "Erreur serveur lors de l'inscription" });
        }
        
        if (usernameExists) {
          logger.warn(`Tentative d'inscription échouée: nom d'utilisateur ${username} déjà utilisé`);
          return res.status(400).json({ error: "Ce nom d'utilisateur est déjà utilisé" });
        } else {
          logger.warn(`Tentative d'inscription échouée: email ${email} déjà utilisé`);
          return res.status(400).json({ error: "Cet email est déjà utilisé" });
        }
      });
      return;
    }
    
    // Utilisation de requêtes paramétrées pour éviter les injections SQL
    db.run(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
      [username, email, hashedPassword, 'standard'],
      function(err) {
        if (err) {
          logger.error(`Erreur lors de l'inscription: ${err.message}`);
          return res.status(500).json({ error: "Erreur serveur lors de l'inscription" });
        }
        
        const userId = this.lastID;
        
        // Création du token JWT pour connecter directement l'utilisateur
        const token = jwt.sign(
          { 
            userId: userId, 
            username: username, 
            role: 'standard' 
          },
          config.JWT_SECRET,
          { expiresIn: config.JWT_EXPIRATION }
        );
        
        logger.info(`Inscription réussie pour l'utilisateur: ${username} (ID: ${userId})`);
        
        // Retourner le token et les informations de l'utilisateur
        res.status(201).json({
          message: "Inscription réussie",
          token,
          user: {
            id: userId,
            username: username,
            role: 'standard'
          }
        });
      }
    );
  });
});

// Route pour la connexion utilisateur
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  logger.info(`Tentative de connexion pour l'utilisateur: ${username}`);
  
  // Validation des données
  if (!username || !password) {
    logger.warn(`Tentative de connexion échouée: identifiants incomplets pour ${username || 'utilisateur inconnu'}`);
    return res.status(400).json({ error: "Le nom d'utilisateur et le mot de passe sont obligatoires" });
  }
  
  // Vérification des tentatives de connexion
  const userBlockStatus = authUtils.isUserBlocked(username);
  if (userBlockStatus.blocked) {
    logger.warn(`Tentative de connexion bloquée pour l'utilisateur ${username} (encore ${userBlockStatus.remainingTimeSec} secondes)`);
    return res.status(429).json({ 
      error: "Trop de tentatives échouées", 
      blockedUntil: userBlockStatus.blockedUntil,
      remainingTime: userBlockStatus.remainingTimeSec
    });
  }
  
  // Initialiser les tentatives pour cet utilisateur s'il n'existe pas
  if (!authUtils.loginAttempts[username]) {
    authUtils.initLoginAttempts(username);
  }
  
  // Hashage du mot de passe pour la comparaison
  const hashedPassword = authUtils.hashPassword(password);
  
  // Recherche de l'utilisateur dans la base de données
  db.get(
    "SELECT id, username, role FROM users WHERE username = ? AND password = ?",
    [username, hashedPassword],
    (err, user) => {
      if (err) {
        logger.error(`Erreur lors de la vérification des identifiants: ${err.message}`);
        return res.status(500).json({ error: "Erreur serveur lors de la connexion" });
      }
      
      if (!user) {
        // Incrémenter le compteur de tentatives échouées
        const attemptResult = authUtils.incrementLoginAttempts(username);
        
        if (attemptResult.blocked) {
          return res.status(429).json({ 
            error: "Trop de tentatives échouées. Compte temporairement bloqué pendant 1 minute.", 
            blockedUntil: attemptResult.blockedUntil,
            remainingTime: attemptResult.remainingTime
          });
        }
        
        logger.warn(`Tentative de connexion échouée: identifiants incorrects pour ${username} (tentative ${5 - attemptResult.attemptsLeft}/5)`);
        return res.status(401).json({ 
          error: "Identifiants incorrects", 
          attemptsLeft: attemptResult.attemptsLeft
        });
      }
      
      // Connexion réussie - réinitialiser le compteur de tentatives
      authUtils.initLoginAttempts(username);
      
      // Création du token JWT
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username, 
          role: user.role 
        },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRATION }
      );
      
      logger.info(`Connexion réussie pour l'utilisateur: ${username} (ID: ${user.id}, Rôle: ${user.role})`);
      
      // Retourner le token et les informations de l'utilisateur
      res.json({
        message: "Connexion réussie",
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    }
  );
});

// Route pour obtenir le profil utilisateur
router.get("/profile", auth, (req, res) => {
  logger.info(`Accès au profil pour l'utilisateur: ${req.user.username}`);
  
  // Récupérer les informations complètes de l'utilisateur depuis la base de données
  db.get(
    "SELECT id, username, email, role, created_at FROM users WHERE id = ?",
    [req.user.userId],
    (err, user) => {
      if (err) {
        logger.error(`Erreur lors de la récupération du profil: ${err.message}`);
        return res.status(500).json({ error: "Erreur serveur" });
      }
      
      if (!user) {
        logger.error(`Utilisateur introuvable pour l'ID: ${req.user.userId}`);
        return res.status(404).json({ error: "Utilisateur introuvable" });
      }
      
      // Retourner les informations de l'utilisateur (sans le mot de passe)
      res.json(user);
    }
  );
});

module.exports = router;
