const express = require('express');
const router = express.Router();
const professorController = require('../controllers/professorController');
const { isAuthenticated, isProfessor } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Todas as rotas requerem autenticação como professor
router.use(isAuthenticated, isProfessor);

// Dashboard
router.get('/dashboard', professorController.dashboard);

// Turmas
router.get('/turmas', professorController.listarTurmas);
router.get('/turmas/criar', professorController.formCriarTurma);
router.post('/turmas', professorController.criarTurma);
router.get('/turmas/:id', professorController.detalheTurma);
router.post('/turmas/:id/excluir', professorController.excluirTurma);

// Atividades
router.get('/atividades', professorController.listarAtividades);
router.get('/atividades/criar', professorController.formCriarAtividade);
router.post('/atividades', upload.single('imagem'), professorController.criarAtividade);
router.get('/atividades/:id', professorController.detalheAtividade);
router.get('/atividades/:id/editar', professorController.formEditarAtividade);
router.post('/atividades/:id', upload.single('imagem'), professorController.editarAtividade);
router.post('/atividades/:id/excluir', professorController.excluirAtividade);

// Associar atividade a turmas
router.get('/atividades/:id/associar', professorController.formAssociarAtividade);
router.post('/atividades/:id/associar', professorController.associarAtividade);

// Itens das atividades (lixo, palavras, questões, etc.)
router.post('/atividades/:id/item', upload.single('imagemLixo'), professorController.adicionarItem);
router.post('/atividades/:id/item/:itemId/excluir', professorController.excluirItem);

// Avaliar desafios diários
router.get('/desafios/avaliar', professorController.listarDesafiosPendentes);
router.get('/desafios/:id/avaliar', professorController.formAvaliarDesafio);
router.post('/desafios/:id/avaliar', professorController.avaliarDesafio);

// Relatórios
router.get('/relatorios', professorController.relatorios);
router.get('/relatorios/turma/:id', professorController.relatorioTurma);

module.exports = router;
