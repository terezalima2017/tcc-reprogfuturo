const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginLimiter, registerLimiter } = require('../middlewares/rateLimiter');
const { validadorRegistro, validadorLogin } = require('../middlewares/validation');

// Landing page
router.get('/', authController.home);

// Login
router.get('/login', authController.loginForm);
router.post('/login', loginLimiter, validadorLogin, authController.login);

// Registro
router.get('/register', authController.registerForm);
router.post('/register', registerLimiter, validadorRegistro, authController.register);

// Logout
router.get('/logout', authController.logout);

module.exports = router;
