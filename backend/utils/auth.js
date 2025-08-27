const crypto = require("crypto-js");
const logger = require("./logger");

// Fonction pour valider la complexité du mot de passe
const validatePassword = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push("Le mot de passe doit contenir au moins 8 caractères");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une lettre majuscule");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une lettre minuscule");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un chiffre");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un caractère spécial");
  }
  
  return errors;
};

// Fonction pour hasher un mot de passe
const hashPassword = (password) => {
  return crypto.SHA256(password).toString();
};

// Système de limitation des tentatives de connexion
const loginAttempts = {}; // { username: { count: number, lastAttempt: timestamp, blockedUntil: timestamp } }

// Vérifier si un utilisateur est bloqué
const isUserBlocked = (username) => {
  const now = Date.now();
  if (loginAttempts[username] && 
      loginAttempts[username].blockedUntil && 
      loginAttempts[username].blockedUntil > now) {
    return {
      blocked: true,
      remainingTimeMs: loginAttempts[username].blockedUntil - now,
      remainingTimeSec: Math.ceil((loginAttempts[username].blockedUntil - now) / 1000)
    };
  }
  return { blocked: false };
};

// Initialiser ou réinitialiser les tentatives de connexion
const initLoginAttempts = (username) => {
  loginAttempts[username] = { count: 0, lastAttempt: Date.now(), blockedUntil: null };
};

// Incrémenter les tentatives de connexion
const incrementLoginAttempts = (username) => {
  const now = Date.now();
  
  if (!loginAttempts[username]) {
    initLoginAttempts(username);
  }
  
  loginAttempts[username].count += 1;
  loginAttempts[username].lastAttempt = now;
  
  // Vérifier si l'utilisateur doit être bloqué (5 tentatives échouées)
  if (loginAttempts[username].count >= 5) {
    // Bloquer pour 1 minute (60000 ms)
    const blockUntil = now + 60000;
    loginAttempts[username].blockedUntil = blockUntil;
    
    // Log critique pour signaler le blocage
    logger.critical(`SÉCURITÉ: Compte ${username} bloqué après ${loginAttempts[username].count} tentatives de connexion échouées`);
    
    return {
      blocked: true,
      blockedUntil: blockUntil,
      remainingTime: 60
    };
  }
  
  return {
    blocked: false,
    attemptsLeft: 5 - loginAttempts[username].count
  };
};

module.exports = {
  validatePassword,
  hashPassword,
  isUserBlocked,
  initLoginAttempts,
  incrementLoginAttempts,
  loginAttempts
};
