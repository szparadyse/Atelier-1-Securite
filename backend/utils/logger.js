// Copie du fichier logger.js existant
// Ce fichier est supposé exister déjà dans le projet original

// Si le fichier n'existe pas ou a besoin d'être modifié, voici une implémentation simple
const fs = require('fs');
const path = require('path');

// Création du dossier logs s'il n'existe pas
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Niveaux de log
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4
};

// Couleurs pour la console
const COLORS = {
  RESET: '\x1b[0m',
  DEBUG: '\x1b[36m',    // Cyan
  INFO: '\x1b[32m',     // Vert
  WARN: '\x1b[33m',     // Jaune
  ERROR: '\x1b[31m',    // Rouge
  CRITICAL: '\x1b[41m'  // Fond rouge
};

// Niveau de log minimum (configurable)
let currentLogLevel = LOG_LEVELS.DEBUG;

// Fonction pour écrire dans le fichier de log
const writeToFile = (message) => {
  const logFile = path.join(logsDir, 'app.log');
  const timestamp = new Date().toISOString();
  fs.appendFile(logFile, `${timestamp} - ${message}\n`, (err) => {
    if (err) console.error('Erreur lors de l\'écriture dans le fichier de log:', err);
  });
};

// Fonction générique de log
const log = (level, message) => {
  if (level >= currentLogLevel) {
    const timestamp = new Date().toISOString();
    let levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level) || 'UNKNOWN';
    
    // Log dans la console avec couleur
    const color = COLORS[levelName] || COLORS.RESET;
    console.log(`${color}${timestamp} - ${levelName}: ${message}${COLORS.RESET}`);
    
    // Log dans le fichier
    writeToFile(`${levelName}: ${message}`);
  }
};

// Fonctions spécifiques pour chaque niveau de log
const logger = {
  setLogLevel: (level) => {
    if (LOG_LEVELS[level] !== undefined) {
      currentLogLevel = LOG_LEVELS[level];
    }
  },
  debug: (message) => log(LOG_LEVELS.DEBUG, message),
  info: (message) => log(LOG_LEVELS.INFO, message),
  warn: (message) => log(LOG_LEVELS.WARN, message),
  error: (message) => log(LOG_LEVELS.ERROR, message),
  critical: (message) => log(LOG_LEVELS.CRITICAL, message)
};

module.exports = logger;
