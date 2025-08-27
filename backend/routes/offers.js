const express = require("express");
const router = express.Router();
const { validationResult } = require("express-validator");
const { db } = require("../models/db");
const logger = require("../utils/logger");
const { auth } = require("../middleware/auth");
const { offerValidators } = require("../middleware/validators");

// Route pour récupérer toutes les offres
router.get("/", (req, res) => {
  logger.debug("Requête GET /api/offers reçue");
  db.all("SELECT * FROM offers", [], (err, rows) => {
    if (err) {
      logger.error(`Erreur SELECT offers: ${err.message}`);
      res.status(500).json({ error: err.message });
    } else {
      logger.info(`Récupération de ${rows.length} offre(s)`);
      res.json(rows);
    }
  });
});

// Route pour créer une offre (authentification requise)
router.post("/", auth, offerValidators, (req, res) => {
  // Vérification des erreurs de validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    logger.warn(`Validation échouée pour la création d'offre par ${req.user.username}: ${errorMessages.join(', ')}`);
    return res.status(400).json({ 
      error: "Données invalides", 
      details: errorMessages 
    });
  }

  const { title, description, price } = req.body;
  logger.info(`Création d'une offre par l'utilisateur ${req.user.username} (ID: ${req.user.userId})`);
  
  // Utilisation de requêtes paramétrées pour éviter les injections SQL
  db.run(
    "INSERT INTO offers (title, description, price, created_by) VALUES (?, ?, ?, ?)",
    [title, description, price, req.user.userId],
    function (err) {
      if (err) {
        logger.error(`Erreur lors de la création d'offre: ${err.message}`);
        return res.status(500).json({ error: "Erreur serveur lors de la création de l'offre" });
      }
      
      const offerId = this.lastID;
      logger.info(`Nouvelle offre créée avec succès: ID=${offerId}, par utilisateur ${req.user.username}`);
      
      // Retourner les détails de l'offre créée
      res.status(201).json({ 
        id: offerId, 
        title, 
        description, 
        price,
        created_by: req.user.userId,
        created_at: new Date().toISOString()
      });
    }
  );
});

// Route pour récupérer les offres créées par l'utilisateur connecté
router.get("/my-offers", auth, (req, res) => {
  logger.info(`Récupération des offres pour l'utilisateur: ${req.user.username} (ID: ${req.user.userId})`);
  
  db.all(
    "SELECT * FROM offers WHERE created_by = ?",
    [req.user.userId],
    (err, offers) => {
      if (err) {
        logger.error(`Erreur lors de la récupération des offres de l'utilisateur: ${err.message}`);
        return res.status(500).json({ error: "Erreur serveur" });
      }
      
      logger.info(`${offers.length} offre(s) récupérée(s) pour l'utilisateur ${req.user.username}`);
      res.json(offers);
    }
  );
});

// Route pour récupérer une offre spécifique par son ID
router.get("/:id", (req, res) => {
  const offerId = req.params.id;
  logger.debug(`Requête GET /api/offers/${offerId} reçue`);
  
  db.get("SELECT * FROM offers WHERE id = ?", [offerId], (err, offer) => {
    if (err) {
      logger.error(`Erreur lors de la récupération de l'offre ${offerId}: ${err.message}`);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    
    if (!offer) {
      logger.warn(`Offre introuvable: ID=${offerId}`);
      return res.status(404).json({ error: "Offre introuvable" });
    }
    
    logger.info(`Offre récupérée: ID=${offerId}`);
    res.json(offer);
  });
});

// Route pour acheter une offre (authentification requise)
router.post("/:id/buy", auth, (req, res) => {
  const offerId = req.params.id;
  const buyerId = req.user.userId;
  
  logger.info(`Tentative d'achat de l'offre ${offerId} par l'utilisateur ${req.user.username} (ID: ${buyerId})`);
  
  // Vérifier si l'offre existe et est disponible
  db.get("SELECT * FROM offers WHERE id = ?", [offerId], (err, offer) => {
    if (err) {
      logger.error(`Erreur lors de la vérification de l'offre ${offerId}: ${err.message}`);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    
    if (!offer) {
      logger.warn(`Offre introuvable: ID=${offerId}`);
      return res.status(404).json({ error: "Offre introuvable" });
    }
    
    // Vérifier si l'utilisateur n'essaie pas d'acheter sa propre offre
    if (offer.created_by === buyerId) {
      logger.warn(`L'utilisateur ${req.user.username} a tenté d'acheter sa propre offre: ID=${offerId}`);
      return res.status(400).json({ error: "Vous ne pouvez pas acheter votre propre offre" });
    }
    
    // Vérifier si l'offre est déjà vendue
    if (offer.status === 'vendu') {
      logger.warn(`L'offre ${offerId} est déjà vendue`);
      return res.status(400).json({ error: "Cette offre a déjà été vendue" });
    }
    
    // Mettre à jour l'offre comme vendue
    db.run(
      "UPDATE offers SET status = 'vendu', buyer_id = ? WHERE id = ?",
      [buyerId, offerId],
      function(err) {
        if (err) {
          logger.error(`Erreur lors de l'achat de l'offre ${offerId}: ${err.message}`);
          return res.status(500).json({ error: "Erreur serveur lors de l'achat" });
        }
        
        logger.info(`Offre ${offerId} achetée avec succès par l'utilisateur ${req.user.username} (ID: ${buyerId})`);
        
        // Retourner les détails de l'offre achetée
        res.json({ 
          message: "Offre achetée avec succès",
          offer: {
            ...offer,
            status: 'vendu',
            buyer_id: buyerId
          }
        });
      }
    );
  });
});

module.exports = router;
