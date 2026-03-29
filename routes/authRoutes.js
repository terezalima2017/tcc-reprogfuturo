const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Landing page
router.get('/', authController.home);

// Login
router.get('/login', authController.loginForm);
router.post('/login', authController.login);

// Registro
router.get('/register', authController.registerForm);
router.post('/register', authController.register);

// Logout
router.get('/logout', authController.logout);

module.exports = router;
