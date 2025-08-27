const express = require("express");
const router = express.Router();
const { db } = require("../models/db");
const logger = require("../utils/logger");
const { auth, isAdmin } = require("../middleware/auth");

// Route pour récupérer tous les utilisateurs (admin uniquement)
router.get("/users", auth, isAdmin, (req, res) => {
  logger.info(`Accès à la liste des utilisateurs par l'admin: ${req.user.username}`);
  
  db.all("SELECT id, username, email, role, created_at FROM users", [], (err, users) => {
    if (err) {
      logger.error(`Erreur lors de la récupération des utilisateurs: ${err.message}`);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    
    logger.info(`${users.length} utilisateurs récupérés par l'admin ${req.user.username}`);
    res.json(users);
  });
});

// Route pour récupérer toutes les réservations (admin uniquement)
router.get("/reservations", auth, isAdmin, (req, res) => {
  logger.info(`Accès à la liste des réservations par l'admin: ${req.user.username}`);
  
  db.all(`
    SELECT r.*, u.username as user_username, o.title as offer_title 
    FROM reservations r
    JOIN users u ON r.user_id = u.id
    JOIN offers o ON r.offer_id = o.id
  `, [], (err, reservations) => {
    if (err) {
      logger.error(`Erreur lors de la récupération des réservations: ${err.message}`);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    
    logger.info(`${reservations.length} réservations récupérées par l'admin ${req.user.username}`);
    res.json(reservations);
  });
});

module.exports = router;
