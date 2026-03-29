const express = require('express');
const router = express.Router();
const alunoController = require('../controllers/alunoController');
const { isAuthenticated, isAluno } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.use(isAuthenticated, isAluno);

// Dashboard
router.get('/dashboard', alunoController.dashboard);

// Entrar em turma
router.get('/entrar-turma', alunoController.formEntrarTurma);
router.post('/entrar-turma', alunoController.entrarTurma);

// Atividades
router.get('/atividades', alunoController.listarAtividades);
router.get('/atividades/:id/jogar', alunoController.jogarAtividade);
router.post('/atividades/:id/responder', alunoController.responderAtividade);

// Desafio diário - enviar evidência
router.post('/atividades/:id/evidencia', upload.array('fotos', 3), alunoController.enviarEvidencia);

// Perfil
router.get('/perfil', alunoController.perfil);

// Certificado
router.get('/certificado', alunoController.certificado);
router.get('/certificado/download', alunoController.downloadCertificado);

module.exports = router;
