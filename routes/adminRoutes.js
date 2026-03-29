const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, isAdmin } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.use(isAuthenticated, isAdmin);

// Dashboard
router.get('/dashboard', adminController.dashboard);

// Gerenciar atividades template
router.get('/atividades', adminController.listarAtividades);
router.get('/atividades/criar', adminController.formCriarAtividade);
router.post('/atividades', upload.single('imagem'), adminController.criarAtividade);
router.get('/atividades/:id', adminController.detalheAtividade);
router.get('/atividades/:id/editar', adminController.formEditarAtividade);
router.post('/atividades/:id', upload.single('imagem'), adminController.editarAtividade);
router.post('/atividades/:id/excluir', adminController.excluirAtividade);

// Itens das atividades template
router.post('/atividades/:id/item', upload.single('imagemLixo'), adminController.adicionarItem);
router.post('/atividades/:id/item/:itemId/excluir', adminController.excluirItem);

module.exports = router;
