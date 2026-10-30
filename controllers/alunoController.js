const { Usuario, Turma, AlunoTurma, Atividade, AtividadeTurma, LixoMisterioso, CacaPalavras, VerdadeiroFalso, MultiplaEscolha, DesafioDiario, RespostaAtividade, EvidenciaDesafio, Certificado } = require('../models');
const pontuacaoService = require('../services/pontuacaoService');
const certificadoService = require('../services/certificadoService');
const cacaPalavrasService = require('../services/cacaPalavrasService');
const upload = require('../middlewares/upload');
const { Op } = require('sequelize');

const alunoController = {
  dashboard: async (req, res) => {
    try {
      const alunoId = req.session.usuario.id;
      const matricula = await AlunoTurma.findOne({
        where: { alunoId },
        include: [{ model: Turma, as: 'turma', include: [{ model: Usuario, as: 'professor', attributes: ['nome'] }] }]
      });
      const aluno = await Usuario.findByPk(alunoId);
      let atividadesPendentes = 0, atividadesRealizadas = 0, totalAtividades = 0;
      if (matricula) {
        totalAtividades = await AtividadeTurma.count({ where: { turmaId: matricula.turmaId } });
        atividadesRealizadas = await RespostaAtividade.count({ where: { alunoId, turmaId: matricula.turmaId, finalizada: true } });
        atividadesPendentes = totalAtividades - atividadesRealizadas;
      }
      const ultimasRespostas = await RespostaAtividade.findAll({
        where: { alunoId, finalizada: true },
        include: [{ model: Atividade, as: 'atividade', attributes: ['nome', 'tipo'] }],
        order: [['updatedAt', 'DESC']], limit: 5
      });
      let certificadoDisponivel = false;
      let todasAtividadesConcluidas = false;
      if (matricula && totalAtividades > 0 && atividadesRealizadas >= totalAtividades) {
        todasAtividadesConcluidas = true;
      }
      if (matricula) {
        const cert = await Certificado.findOne({ where: { alunoId, turmaId: matricula.turmaId } });
        certificadoDisponivel = !!cert;
      }
      res.render('aluno/dashboard', {
        title: 'Dashboard - Aluno', aluno: aluno.toJSON(),
        matricula: matricula ? matricula.toJSON() : null, temTurma: !!matricula,
        atividadesPendentes, atividadesRealizadas, totalAtividades,
        ultimasRespostas: ultimasRespostas.map(r => r.toJSON()), certificadoDisponivel, todasAtividadesConcluidas
      });
    } catch (error) {
      console.error('Erro no dashboard do aluno:', error);
      req.session.mensagemErro = 'Erro ao carregar dashboard.';
      res.redirect('/');
    }
  },

  formEntrarTurma: async (req, res) => {
    const matricula = await AlunoTurma.findOne({ where: { alunoId: req.session.usuario.id } });
    if (matricula) { req.session.mensagemErro = 'Você já está em uma turma.'; return res.redirect('/aluno/dashboard'); }
    res.render('aluno/entrarTurma', { title: 'Entrar em Turma' });
  },

  entrarTurma: async (req, res) => {
    try {
      const alunoId = req.session.usuario.id;
      const { codigo } = req.body;
      const jaMatriculado = await AlunoTurma.findOne({ where: { alunoId } });
      if (jaMatriculado) { req.session.mensagemErro = 'Você já está em uma turma.'; return res.redirect('/aluno/dashboard'); }
      if (!codigo || codigo.trim().length !== 6) { req.session.mensagemErro = 'Código deve ter 6 caracteres.'; return res.redirect('/aluno/entrar-turma'); }
      const turma = await Turma.findOne({ where: { codigo: codigo.trim().toUpperCase() } });
      if (!turma) { req.session.mensagemErro = 'Turma não encontrada.'; return res.redirect('/aluno/entrar-turma'); }
      await AlunoTurma.create({ alunoId, turmaId: turma.id });
      req.session.mensagemSucesso = `Você entrou na turma "${turma.nome}"! 🎉`;
      res.redirect('/aluno/dashboard');
    } catch (error) {
      console.error('Erro:', error); req.session.mensagemErro = 'Erro ao entrar na turma.'; res.redirect('/aluno/entrar-turma');
    }
  },

  listarAtividades: async (req, res) => {
    try {
      const alunoId = req.session.usuario.id;
      const matricula = await AlunoTurma.findOne({ where: { alunoId } });
      if (!matricula) { req.session.mensagemErro = 'Entre em uma turma primeiro.'; return res.redirect('/aluno/entrar-turma'); }
      const atividadesTurma = await AtividadeTurma.findAll({
        where: { turmaId: matricula.turmaId },
        include: [{ model: Atividade, as: 'atividade' }],
        order: [['dataAtribuicao', 'DESC']]
      });
      const respostas = await RespostaAtividade.findAll({ where: { alunoId, turmaId: matricula.turmaId } });
      const respostaMap = {};
      respostas.forEach(r => { respostaMap[r.atividadeId] = r.toJSON(); });
      const atividadesComStatus = atividadesTurma.map(at => {
        const atJson = at.toJSON();
        const resp = respostaMap[atJson.atividade.id];
        return { ...atJson.atividade, dataAtribuicao: atJson.dataAtribuicao, resposta: resp || null,
          status: resp ? (resp.finalizada ? 'finalizada' : 'em_andamento') : 'pendente' };
      });
      res.render('aluno/atividades', { title: 'Minhas Atividades', atividades: atividadesComStatus });
    } catch (error) {
      console.error('Erro:', error); req.session.mensagemErro = 'Erro ao carregar atividades.'; res.redirect('/aluno/dashboard');
    }
  },

  jogarAtividade: async (req, res) => {
    try {
      const alunoId = req.session.usuario.id;
      const atividadeId = req.params.id;
      const matricula = await AlunoTurma.findOne({ where: { alunoId } });
      if (!matricula) { req.session.mensagemErro = 'Entre em uma turma.'; return res.redirect('/aluno/dashboard'); }
      const atTurma = await AtividadeTurma.findOne({ where: { atividadeId, turmaId: matricula.turmaId } });
      if (!atTurma) { req.session.mensagemErro = 'Atividade não disponível.'; return res.redirect('/aluno/atividades'); }
      const respostaExistente = await RespostaAtividade.findOne({ where: { alunoId, atividadeId, turmaId: matricula.turmaId, finalizada: true } });
      if (respostaExistente) { req.session.mensagemErro = 'Atividade já realizada.'; return res.redirect('/aluno/atividades'); }
      const atividade = await Atividade.findByPk(atividadeId, {
        include: [
          { model: LixoMisterioso, as: 'itensLixo' }, { model: CacaPalavras, as: 'palavras' },
          { model: VerdadeiroFalso, as: 'afirmacoes' }, { model: MultiplaEscolha, as: 'questoes' },
          { model: DesafioDiario, as: 'tarefas' }
        ]
      });
      if (!atividade) { req.session.mensagemErro = 'Atividade não encontrada.'; return res.redirect('/aluno/atividades'); }
      const atividadeJson = atividade.toJSON();
      const viewMap = {
        'lixo_misterioso': 'aluno/jogoLixoMisterioso', 'caca_palavras': 'aluno/jogoCacaPalavras',
        'verdadeiro_falso': 'aluno/jogoVerdadeiroFalso', 'multipla_escolha': 'aluno/jogoMultiplaEscolha',
        'desafio_diario': 'aluno/desafioDiario'
      };
      // Envia apenas os campos seguros da atividade (sem includes que contêm respostas corretas)
      const atividadeSafe = {
        id: atividade.id,
        nome: atividade.nome,
        descricao: atividade.descricao,
        tipo: atividade.tipo,
        questoes: atividadeJson.questoes || [],
        afirmacoes: atividadeJson.afirmacoes || [],
        palavras: atividadeJson.palavras || [],
        tarefas: atividadeJson.tarefas || []
      };
      const viewData = { title: atividade.nome, atividade: atividadeSafe, turmaId: matricula.turmaId };
      if (atividade.tipo === 'caca_palavras' && atividadeJson.palavras.length > 0) {
        const palavras = atividadeJson.palavras.map(p => p.palavra);
        const tamGrade = cacaPalavrasService.calcularTamanhoGrade(palavras);
        viewData.grade = cacaPalavrasService.gerarGrade(palavras, tamGrade);
        viewData.tamGrade = tamGrade;
        viewData.palavrasJSON = JSON.stringify(palavras);
        viewData.gradeJSON = JSON.stringify(viewData.grade);
      }
      if (atividade.tipo === 'lixo_misterioso') {
        const itensFiltrados = (atividadeJson.itensLixo || []).map(item => {
          const { lixeiraCorreta, ...rest } = item;
          return rest;
        });
        viewData.itensJSON = JSON.stringify(itensFiltrados);
      }
      if (atividade.tipo === 'verdadeiro_falso') {
        const afirmacoesFiltradas = (atividadeJson.afirmacoes || []).map(af => {
          const { resposta, ...rest } = af;
          return rest;
        });
        viewData.afirmacoesJSON = JSON.stringify(afirmacoesFiltradas);
      }
      if (atividade.tipo === 'multipla_escolha') {
        const questoesFiltradas = (atividadeJson.questoes || []).map(q => {
          const { respostaCorreta, ...rest } = q;
          return rest;
        });
        viewData.questoesJSON = JSON.stringify(questoesFiltradas);
      }
      res.render(viewMap[atividade.tipo], viewData);
    } catch (error) {
      console.error('Erro:', error); req.session.mensagemErro = 'Erro ao carregar atividade.'; res.redirect('/aluno/atividades');
    }
  },

  responderAtividade: async (req, res) => {
    try {
      const alunoId = req.session.usuario.id;
      const atividadeId = req.params.id;
      const { respostas, turmaId } = req.body;
      const matricula = await AlunoTurma.findOne({ where: { alunoId } });
      if (!matricula) return res.status(403).json({ erro: 'Não matriculado.' });
      const existente = await RespostaAtividade.findOne({ where: { alunoId, atividadeId, turmaId: matricula.turmaId, finalizada: true } });
      if (existente) return res.status(400).json({ erro: 'Já realizada.' });
      const atividade = await Atividade.findByPk(atividadeId, {
        include: [{ model: LixoMisterioso, as: 'itensLixo' }, { model: VerdadeiroFalso, as: 'afirmacoes' },
          { model: MultiplaEscolha, as: 'questoes' }, { model: CacaPalavras, as: 'palavras' }]
      });
      if (!atividade) return res.status(404).json({ erro: 'Não encontrada.' });
      const respostasObj = typeof respostas === 'string' ? JSON.parse(respostas) : respostas;
      const pontuacao = pontuacaoService.calcular(atividade, respostasObj);
      let resposta = await RespostaAtividade.findOne({ where: { alunoId, atividadeId, turmaId: matricula.turmaId } });
      if (resposta) {
        resposta.pontuacao = pontuacao; resposta.finalizada = true; resposta.respostas = respostasObj; await resposta.save();
      } else {
        resposta = await RespostaAtividade.create({ alunoId, atividadeId, turmaId: matricula.turmaId, pontuacao, finalizada: true, respostas: respostasObj });
      }
      const todasRespostas = await RespostaAtividade.findAll({ where: { alunoId, finalizada: true } });
      const totalPontos = todasRespostas.reduce((sum, r) => sum + r.pontuacao, 0);
      await Usuario.update({ pontuacaoAcumulada: totalPontos }, { where: { id: alunoId } });
      await certificadoService.verificarEGerarCertificado(alunoId, matricula.turmaId);
      res.json({ sucesso: true, pontuacao, feedback: pontuacaoService.getFeedback(pontuacao) });
    } catch (error) {
      console.error('Erro:', error); res.status(500).json({ erro: 'Erro ao processar resposta.' });
    }
  },

  enviarEvidencia: async (req, res) => {
    try {
      const alunoId = req.session.usuario.id;
      const atividadeId = req.params.id;
      const { relatorio } = req.body;
      const matricula = await AlunoTurma.findOne({ where: { alunoId } });
      if (!matricula) { req.session.mensagemErro = 'Não matriculado.'; return res.redirect('/aluno/atividades'); }
      if (!relatorio || relatorio.trim().length < 10) { req.session.mensagemErro = 'Relatório mín. 10 caracteres.'; return res.redirect(`/aluno/atividades/${atividadeId}/jogar`); }
      if (!req.files || req.files.length === 0) { req.session.mensagemErro = 'Envie pelo menos uma foto.'; return res.redirect(`/aluno/atividades/${atividadeId}/jogar`); }
      let resposta = await RespostaAtividade.findOne({ where: { alunoId, atividadeId, turmaId: matricula.turmaId } });
      if (!resposta) { resposta = await RespostaAtividade.create({ alunoId, atividadeId, turmaId: matricula.turmaId, pontuacao: 0, finalizada: false }); }
      const fotos = req.files.map(f => upload.getFileUrl(f));
      await EvidenciaDesafio.create({ respostaAtividadeId: resposta.id, fotoUrl: fotos[0], fotos, relatorio: relatorio.trim(), status: 'pendente' });
      req.session.mensagemSucesso = 'Evidência enviada! Aguarde avaliação. 📸';
      res.redirect('/aluno/atividades');
    } catch (error) {
      console.error('Erro:', error); req.session.mensagemErro = 'Erro ao enviar.'; res.redirect('/aluno/atividades');
    }
  },

  perfil: async (req, res) => {
    try {
      const alunoId = req.session.usuario.id;
      const aluno = await Usuario.findByPk(alunoId);
      const matricula = await AlunoTurma.findOne({ where: { alunoId }, include: [{ model: Turma, as: 'turma' }] });
      const respostas = await RespostaAtividade.findAll({
        where: { alunoId, finalizada: true },
        include: [{ model: Atividade, as: 'atividade', attributes: ['nome', 'tipo'] }],
        order: [['updatedAt', 'DESC']]
      });
      const totalPontos = respostas.reduce((s, r) => s + r.pontuacao, 0);
      const media = respostas.length > 0 ? totalPontos / respostas.length : 0;
      let certificado = null;
      if (matricula) {
        certificado = await Certificado.findOne({ where: { alunoId, turmaId: matricula.turmaId } });
      }
      res.render('aluno/perfil', {
        title: 'Meu Perfil', aluno: aluno.toJSON(), matricula: matricula ? matricula.toJSON() : null,
        respostas: respostas.map(r => r.toJSON()), totalAtividades: respostas.length, pontuacaoMedia: media.toFixed(1),
        certificado: certificado ? certificado.toJSON() : null
      });
    } catch (error) { console.error('Erro:', error); req.session.mensagemErro = 'Erro.'; res.redirect('/aluno/dashboard'); }
  },

  certificado: async (req, res) => {
    try {
      const alunoId = req.session.usuario.id;
      const certificado = await Certificado.findOne({
        where: { alunoId },
        include: [
          { model: Usuario, as: 'aluno' },
          { model: Turma, as: 'turma', attributes: ['id', 'nome', 'escola'], include: [{ model: Usuario, as: 'professor', attributes: ['nome'] }] }
        ],
        order: [['geradoEm', 'DESC']]
      });
      if (!certificado) { req.session.mensagemErro = 'Certificado não disponível ainda.'; return res.redirect('/aluno/dashboard'); }

      // Recalcula a média atual com todas as respostas finalizadas da turma
      const respostasAtuais = await RespostaAtividade.findAll({
        where: { alunoId, turmaId: certificado.turmaId, finalizada: true }
      });
      if (respostasAtuais.length > 0) {
        const mediaAtual = Math.round((respostasAtuais.reduce((s, r) => s + r.pontuacao, 0) / respostasAtuais.length) * 10) / 10;
        if (certificado.pontuacaoMedia !== mediaAtual) {
          await certificado.update({ pontuacaoMedia: mediaAtual, geradoEm: new Date() });
        }
      }

      res.render('aluno/certificado', { title: 'Meu Certificado', certificado: certificado.toJSON() });
    } catch (error) { console.error('Erro:', error); res.redirect('/aluno/dashboard'); }
  },

  downloadCertificado: async (req, res) => {
    try {
      const alunoId = req.session.usuario.id;
      const certificado = await Certificado.findOne({
        where: { alunoId },
        include: [
          { model: Usuario, as: 'aluno' },
          { model: Turma, as: 'turma', attributes: ['id', 'nome', 'escola'], include: [{ model: Usuario, as: 'professor', attributes: ['nome'] }] }
        ],
        order: [['geradoEm', 'DESC']]
      });
      if (!certificado) { req.session.mensagemErro = 'Certificado não encontrado.'; return res.redirect('/aluno/dashboard'); }

      // Garante que o PDF sempre usa a média mais atual
      const respostasAtuais = await RespostaAtividade.findAll({
        where: { alunoId, turmaId: certificado.turmaId, finalizada: true }
      });
      if (respostasAtuais.length > 0) {
        const mediaAtual = Math.round((respostasAtuais.reduce((s, r) => s + r.pontuacao, 0) / respostasAtuais.length) * 10) / 10;
        if (certificado.pontuacaoMedia !== mediaAtual) {
          await certificado.update({ pontuacaoMedia: mediaAtual, geradoEm: new Date() });
        }
      }

      const pdfBuffer = await certificadoService.gerarPDF(certificado);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=certificado-${certificado.aluno.nome.replace(/\s+/g, '_')}.pdf`);
      res.send(pdfBuffer);
    } catch (error) { console.error('Erro:', error); req.session.mensagemErro = 'Erro ao gerar PDF.'; res.redirect('/aluno/certificado'); }
  }
};

module.exports = alunoController;
