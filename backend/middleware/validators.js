const { body } = require("express-validator");

// Validateurs pour l'inscription
const registerValidators = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage("Le nom d'utilisateur doit contenir entre 3 et 30 caractères")
    .matches(/^[a-zA-Z0-9_]+$/).withMessage("Le nom d'utilisateur ne peut contenir que des lettres, des chiffres et des underscores")
    .escape(), // Protection contre les XSS
  body("email")
    .trim()
    .isEmail().withMessage("Format d'email invalide")
    .normalizeEmail(), // Normaliser l'email
  body("password")
    .isLength({ min: 8 }).withMessage("Le mot de passe doit contenir au moins 8 caractères")
    .matches(/[A-Z]/).withMessage("Le mot de passe doit contenir au moins une lettre majuscule")
    .matches(/[a-z]/).withMessage("Le mot de passe doit contenir au moins une lettre minuscule")
    .matches(/[0-9]/).withMessage("Le mot de passe doit contenir au moins un chiffre")
    .matches(/[^A-Za-z0-9]/).withMessage("Le mot de passe doit contenir au moins un caractère spécial"),
  body("confirmPassword")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Les mots de passe ne correspondent pas");
      }
      return true;
    })
];

// Validateurs pour la création d'offre
const offerValidators = [
  body("title")
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage("Le titre doit contenir entre 3 et 100 caractères")
    .escape(), // Protection contre les XSS
  body("description")
    .trim()
    .isLength({ min: 10, max: 1000 }).withMessage("La description doit contenir entre 10 et 1000 caractères")
    .escape(), // Protection contre les XSS
  body("price")
    .isFloat({ min: 0, max: 1000000 }).withMessage("Le prix doit être un nombre positif inférieur à 1 000 000")
];

module.exports = {
  registerValidators,
  offerValidators
};
