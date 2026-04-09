const { Turma, AlunoTurma, Atividade, AtividadeTurma, LixoMisterioso, CacaPalavras, VerdadeiroFalso, MultiplaEscolha, DesafioDiario, RespostaAtividade, EvidenciaDesafio, Usuario } = require('../models');
const { Op } = require('sequelize');

const professorController = {
  // Dashboard
  dashboard: async (req, res) => {
    try {
      const professorId = req.session.usuario.id;
      const turmas = await Turma.findAll({
        where: { professorId },
        include: [{ model: AlunoTurma, as: 'matriculas' }]
      });

      const atividades = await Atividade.findAll({
        where: { criadorId: professorId, isTemplate: false }
      });

      const totalAlunos = turmas.reduce((sum, t) => sum + (t.matriculas ? t.matriculas.length : 0), 0);

      // Desafios pendentes de avaliação
      const turmaIds = turmas.map(t => t.id);
      let desafiosPendentes = 0;
      if (turmaIds.length > 0) {
        desafiosPendentes = await EvidenciaDesafio.count({
          where: { status: 'pendente' },
          include: [{
            model: RespostaAtividade,
            as: 'respostaAtividade',
            where: { turmaId: { [Op.in]: turmaIds } }
          }]
        });
      }

      res.render('professor/dashboard', {
        title: 'Dashboard - Professor',
        turmas: turmas.map(t => t.toJSON()),
        totalTurmas: turmas.length,
        totalAlunos,
        totalAtividades: atividades.length,
        desafiosPendentes
      });
    } catch (error) {
      console.error('Erro no dashboard do professor:', error);
      req.session.mensagemErro = 'Erro ao carregar dashboard.';
      res.redirect('/');
    }
  },

  // Listar turmas
  listarTurmas: async (req, res) => {
    try {
      const turmas = await Turma.findAll({
        where: { professorId: req.session.usuario.id },
        include: [{ model: AlunoTurma, as: 'matriculas' }],
        order: [['createdAt', 'DESC']]
      });
      res.render('professor/turmas', {
        title: 'Minhas Turmas',
        turmas: turmas.map(t => t.toJSON())
      });
    } catch (error) {
      console.error('Erro ao listar turmas:', error);
      req.session.mensagemErro = 'Erro ao carregar turmas.';
      res.redirect('/professor/dashboard');
    }
  },

  // Formulário de criar turma
  formCriarTurma: (req, res) => {
    res.render('professor/formTurma', { title: 'Criar Turma' });
  },

  // Criar turma
  criarTurma: async (req, res) => {
    try {
      const { nome } = req.body;
      if (!nome || nome.trim().length < 2) {
        req.session.mensagemErro = 'O nome da turma é obrigatório (mínimo 2 caracteres).';
        return res.redirect('/professor/turmas/criar');
      }

      // Gerar código único
      let codigo;
      let codigoExiste = true;
      while (codigoExiste) {
        codigo = Turma.gerarCodigo();
        codigoExiste = await Turma.findOne({ where: { codigo } });
      }

      await Turma.create({
        nome: nome.trim(),
        codigo,
        professorId: req.session.usuario.id
      });

      req.session.mensagemSucesso = `Turma "${nome}" criada com sucesso! Código: ${codigo}`;
      res.redirect('/professor/turmas');
    } catch (error) {
      console.error('Erro ao criar turma:', error);
      req.session.mensagemErro = 'Erro ao criar turma.';
      res.redirect('/professor/turmas/criar');
    }
  },

  // Detalhe da turma
  detalheTurma: async (req, res) => {
    try {
      const turma = await Turma.findOne({
        where: { id: req.params.id, professorId: req.session.usuario.id },
        include: [
          {
            model: AlunoTurma,
            as: 'matriculas',
            include: [{ model: Usuario, as: 'aluno', attributes: ['id', 'nome', 'email', 'pontuacaoAcumulada'] }]
          },
          {
            model: AtividadeTurma,
            as: 'atividadesAssociadas',
            include: [{ model: Atividade, as: 'atividade' }]
          }
        ]
      });

      if (!turma) {
        req.session.mensagemErro = 'Turma não encontrada.';
        return res.redirect('/professor/turmas');
      }

      res.render('professor/turmaDetalhe', {
        title: `Turma: ${turma.nome}`,
        turma: turma.toJSON()
      });
    } catch (error) {
      console.error('Erro ao carregar turma:', error);
      req.session.mensagemErro = 'Erro ao carregar turma.';
      res.redirect('/professor/turmas');
    }
  },

  // Excluir turma
  excluirTurma: async (req, res) => {
    try {
      const turma = await Turma.findOne({
        where: { id: req.params.id, professorId: req.session.usuario.id }
      });
      if (!turma) {
        req.session.mensagemErro = 'Turma não encontrada.';
        return res.redirect('/professor/turmas');
      }
      await AtividadeTurma.destroy({ where: { turmaId: turma.id } });
      await AlunoTurma.destroy({ where: { turmaId: turma.id } });
      await turma.destroy();
      req.session.mensagemSucesso = 'Turma excluída com sucesso.';
      res.redirect('/professor/turmas');
    } catch (error) {
      console.error('Erro ao excluir turma:', error);
      req.session.mensagemErro = 'Erro ao excluir turma.';
      res.redirect('/professor/turmas');
    }
  },

  // Listar atividades do professor
  listarAtividades: async (req, res) => {
    try {
      const atividades = await Atividade.findAll({
        where: { criadorId: req.session.usuario.id, isTemplate: false },
        order: [['createdAt', 'DESC']]
      });

      // Também carregar templates do admin
      const templates = await Atividade.findAll({
        where: { isTemplate: true },
        include: [{ model: Usuario, as: 'criador', attributes: ['nome'] }],
        order: [['createdAt', 'DESC']]
      });

      res.render('professor/atividades', {
        title: 'Minhas Atividades',
        atividades: atividades.map(a => a.toJSON()),
        templates: templates.map(a => a.toJSON())
      });
    } catch (error) {
      console.error('Erro ao listar atividades:', error);
      req.session.mensagemErro = 'Erro ao carregar atividades.';
      res.redirect('/professor/dashboard');
    }
  },

  // Formulário de criar atividade
  formCriarAtividade: (req, res) => {
    res.render('professor/formAtividade', {
      title: 'Criar Atividade',
      editando: false
    });
  },

  // Criar atividade
  criarAtividade: async (req, res) => {
    try {
      const { nome, descricao, tipo } = req.body;

      if (!nome || !descricao || !tipo) {
        req.session.mensagemErro = 'Preencha todos os campos obrigatórios.';
        return res.redirect('/professor/atividades/criar');
      }

      const dadosAtividade = {
        nome: nome.trim(),
        descricao: descricao.trim(),
        tipo,
        criadorId: req.session.usuario.id,
        isTemplate: false
      };

      if (req.file) {
        dadosAtividade.imagemUrl = '/uploads/atividades/' + req.file.filename;
      }

      const atividade = await Atividade.create(dadosAtividade);

      req.session.mensagemSucesso = 'Atividade criada! Agora adicione os itens do jogo.';
      res.redirect(`/professor/atividades/${atividade.id}`);
    } catch (error) {
      console.error('Erro ao criar atividade:', error);
      req.session.mensagemErro = 'Erro ao criar atividade.';
      res.redirect('/professor/atividades/criar');
    }
  },

  // Detalhe da atividade
  detalheAtividade: async (req, res) => {
    try {
      const atividade = await Atividade.findOne({
        where: { id: req.params.id, criadorId: req.session.usuario.id },
        include: [
          { model: LixoMisterioso, as: 'itensLixo' },
          { model: CacaPalavras, as: 'palavras' },
          { model: VerdadeiroFalso, as: 'afirmacoes' },
          { model: MultiplaEscolha, as: 'questoes' },
          { model: DesafioDiario, as: 'tarefas' },
          { model: AtividadeTurma, as: 'turmasAssociadas', include: [{ model: Turma, as: 'turma' }] }
        ]
      });

      if (!atividade) {
        req.session.mensagemErro = 'Atividade não encontrada.';
        return res.redirect('/professor/atividades');
      }

      res.render('professor/detalheAtividade', {
        title: atividade.nome,
        atividade: atividade.toJSON()
      });
    } catch (error) {
      console.error('Erro ao carregar atividade:', error);
      req.session.mensagemErro = 'Erro ao carregar atividade.';
      res.redirect('/professor/atividades');
    }
  },

  // Formulário de editar atividade
  formEditarAtividade: async (req, res) => {
    try {
      const atividade = await Atividade.findOne({
        where: { id: req.params.id, criadorId: req.session.usuario.id }
      });
      if (!atividade) {
        req.session.mensagemErro = 'Atividade não encontrada.';
        return res.redirect('/professor/atividades');
      }
      res.render('professor/formAtividade', {
        title: 'Editar Atividade',
        atividade: atividade.toJSON(),
        editando: true
      });
    } catch (error) {
      console.error('Erro:', error);
      req.session.mensagemErro = 'Erro ao carregar atividade.';
      res.redirect('/professor/atividades');
    }
  },

  // Editar atividade
  editarAtividade: async (req, res) => {
    try {
      const atividade = await Atividade.findOne({
        where: { id: req.params.id, criadorId: req.session.usuario.id }
      });
      if (!atividade) {
        req.session.mensagemErro = 'Atividade não encontrada.';
        return res.redirect('/professor/atividades');
      }

      const { nome, descricao } = req.body;
      atividade.nome = nome.trim();
      atividade.descricao = descricao.trim();
      if (req.file) {
        atividade.imagemUrl = '/uploads/atividades/' + req.file.filename;
      }
      await atividade.save();

      req.session.mensagemSucesso = 'Atividade atualizada com sucesso!';
      res.redirect(`/professor/atividades/${atividade.id}`);
    } catch (error) {
      console.error('Erro ao editar atividade:', error);
      req.session.mensagemErro = 'Erro ao atualizar atividade.';
      res.redirect(`/professor/atividades/${req.params.id}/editar`);
    }
  },

  // Excluir atividade
  excluirAtividade: async (req, res) => {
    try {
      const atividade = await Atividade.findOne({
        where: { id: req.params.id, criadorId: req.session.usuario.id }
      });
      if (!atividade) {
        req.session.mensagemErro = 'Atividade não encontrada.';
        return res.redirect('/professor/atividades');
      }

      // Remover itens relacionados
      await LixoMisterioso.destroy({ where: { atividadeId: atividade.id } });
      await CacaPalavras.destroy({ where: { atividadeId: atividade.id } });
      await VerdadeiroFalso.destroy({ where: { atividadeId: atividade.id } });
      await MultiplaEscolha.destroy({ where: { atividadeId: atividade.id } });
      await DesafioDiario.destroy({ where: { atividadeId: atividade.id } });
      await AtividadeTurma.destroy({ where: { atividadeId: atividade.id } });
      await atividade.destroy();

      req.session.mensagemSucesso = 'Atividade excluída com sucesso.';
      res.redirect('/professor/atividades');
    } catch (error) {
      console.error('Erro ao excluir atividade:', error);
      req.session.mensagemErro = 'Erro ao excluir atividade.';
      res.redirect('/professor/atividades');
    }
  },

  // Formulário de associar atividade a turmas
  formAssociarAtividade: async (req, res) => {
    try {
      const professorId = req.session.usuario.id;

      // Pode ser atividade própria ou template
      const atividade = await Atividade.findOne({
        where: {
          id: req.params.id,
          [Op.or]: [{ criadorId: professorId }, { isTemplate: true }]
        }
      });

      if (!atividade) {
        req.session.mensagemErro = 'Atividade não encontrada.';
        return res.redirect('/professor/atividades');
      }

      const turmas = await Turma.findAll({
        where: { professorId },
        include: [{ model: AlunoTurma, as: 'matriculas' }]
      });

      // Turmas já associadas
      const turmasAssociadas = await AtividadeTurma.findAll({
        where: { atividadeId: atividade.id }
      });
      const turmaIdsAssociados = turmasAssociadas.map(at => at.turmaId);

      res.render('professor/associarAtividade', {
        title: 'Associar Atividade a Turmas',
        atividade: atividade.toJSON(),
        turmas: turmas.map(t => ({
          ...t.toJSON(),
          jaAssociada: turmaIdsAssociados.includes(t.id)
        }))
      });
    } catch (error) {
      console.error('Erro:', error);
      req.session.mensagemErro = 'Erro ao carregar formulário.';
      res.redirect('/professor/atividades');
    }
  },

  // Associar atividade a turmas
  associarAtividade: async (req, res) => {
    try {
      let { turmaIds } = req.body;
      const atividadeId = req.params.id;

      if (!turmaIds) {
        req.session.mensagemErro = 'Selecione pelo menos uma turma.';
        return res.redirect(`/professor/atividades/${atividadeId}/associar`);
      }

      if (!Array.isArray(turmaIds)) turmaIds = [turmaIds];

      // Verificar que as turmas pertencem ao professor
      const turmas = await Turma.findAll({
        where: {
          id: { [Op.in]: turmaIds },
          professorId: req.session.usuario.id
        }
      });

      for (const turma of turmas) {
        const existente = await AtividadeTurma.findOne({
          where: { atividadeId, turmaId: turma.id }
        });
        if (!existente) {
          await AtividadeTurma.create({ atividadeId: parseInt(atividadeId), turmaId: turma.id });
        }
      }

      req.session.mensagemSucesso = `Atividade associada a ${turmas.length} turma(s)!`;
      res.redirect(`/professor/atividades/${atividadeId}`);
    } catch (error) {
      console.error('Erro ao associar atividade:', error);
      req.session.mensagemErro = 'Erro ao associar atividade.';
      res.redirect('/professor/atividades');
    }
  },

  // Adicionar item a uma atividade
  adicionarItem: async (req, res) => {
    try {
      const atividadeId = req.params.id;
      const atividade = await Atividade.findOne({
        where: { id: atividadeId, criadorId: req.session.usuario.id }
      });

      if (!atividade) {
        req.session.mensagemErro = 'Atividade não encontrada.';
        return res.redirect('/professor/atividades');
      }

      switch (atividade.tipo) {
        case 'lixo_misterioso': {
          const { nomeLixo, lixeiraCorreta } = req.body;
          let imagemUrl = '';
          if (req.file) {
            imagemUrl = '/uploads/atividades/' + req.file.filename;
          }
          await LixoMisterioso.create({ atividadeId, nomeLixo, imagemUrl, lixeiraCorreta });
          break;
        }
        case 'caca_palavras': {
          const { palavra } = req.body;
          if (palavra && palavra.trim()) {
            await CacaPalavras.create({ atividadeId, palavra: palavra.trim().toUpperCase() });
          }
          break;
        }
        case 'verdadeiro_falso': {
          const { afirmacao, resposta } = req.body;
          await VerdadeiroFalso.create({
            atividadeId,
            afirmacao,
            resposta: resposta === 'true'
          });
          break;
        }
        case 'multipla_escolha': {
          const { enunciado, alternativaA, alternativaB, alternativaC, alternativaD, alternativaE, respostaCorreta } = req.body;
          await MultiplaEscolha.create({
            atividadeId,
            enunciado, alternativaA, alternativaB, alternativaC, alternativaD,
            alternativaE: alternativaE || null,
            respostaCorreta
          });
          break;
        }
        case 'desafio_diario': {
          const { descricaoTarefa } = req.body;
          await DesafioDiario.create({ atividadeId, descricaoTarefa });
          break;
        }
      }

      req.session.mensagemSucesso = 'Item adicionado com sucesso!';
      res.redirect(`/professor/atividades/${atividadeId}`);
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      req.session.mensagemErro = 'Erro ao adicionar item.';
      res.redirect(`/professor/atividades/${req.params.id}`);
    }
  },

  // Excluir item
  excluirItem: async (req, res) => {
    try {
      const { id: atividadeId, itemId } = req.params;
      const atividade = await Atividade.findOne({
        where: { id: atividadeId, criadorId: req.session.usuario.id }
      });

      if (!atividade) {
        req.session.mensagemErro = 'Atividade não encontrada.';
        return res.redirect('/professor/atividades');
      }

      const modelMap = {
        'lixo_misterioso': LixoMisterioso,
        'caca_palavras': CacaPalavras,
        'verdadeiro_falso': VerdadeiroFalso,
        'multipla_escolha': MultiplaEscolha,
        'desafio_diario': DesafioDiario
      };

      const Model = modelMap[atividade.tipo];
      if (Model) {
        await Model.destroy({ where: { id: itemId, atividadeId } });
      }

      req.session.mensagemSucesso = 'Item removido com sucesso.';
      res.redirect(`/professor/atividades/${atividadeId}`);
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      req.session.mensagemErro = 'Erro ao excluir item.';
      res.redirect(`/professor/atividades/${req.params.id}`);
    }
  },

  // Listar desafios pendentes de avaliação
  listarDesafiosPendentes: async (req, res) => {
    try {
      const turmas = await Turma.findAll({
        where: { professorId: req.session.usuario.id }
      });
      const turmaIds = turmas.map(t => t.id);

      const evidencias = await EvidenciaDesafio.findAll({
        where: { status: 'pendente' },
        include: [{
          model: RespostaAtividade,
          as: 'respostaAtividade',
          where: { turmaId: { [Op.in]: turmaIds } },
          include: [
            { model: Usuario, as: 'aluno', attributes: ['id', 'nome', 'email'] },
            { model: Atividade, as: 'atividade', attributes: ['id', 'nome', 'tipo'] },
            { model: Turma, as: 'turma', attributes: ['id', 'nome'] }
          ]
        }],
        order: [['createdAt', 'ASC']]
      });

      res.render('professor/avaliarDesafios', {
        title: 'Avaliar Desafios Diários',
        evidencias: evidencias.map(e => e.toJSON())
      });
    } catch (error) {
      console.error('Erro ao listar desafios:', error);
      req.session.mensagemErro = 'Erro ao carregar desafios.';
      res.redirect('/professor/dashboard');
    }
  },

  // Formulário de avaliar desafio
  formAvaliarDesafio: async (req, res) => {
    try {
      const evidencia = await EvidenciaDesafio.findOne({
        where: { id: req.params.id },
        include: [{
          model: RespostaAtividade,
          as: 'respostaAtividade',
          include: [
            { model: Usuario, as: 'aluno', attributes: ['id', 'nome', 'email'] },
            { model: Atividade, as: 'atividade' },
            { model: Turma, as: 'turma' }
          ]
        }]
      });

      if (!evidencia) {
        req.session.mensagemErro = 'Evidência não encontrada.';
        return res.redirect('/professor/desafios/avaliar');
      }

      res.render('professor/avaliarDesafioDetalhe', {
        title: 'Avaliar Desafio',
        evidencia: evidencia.toJSON()
      });
    } catch (error) {
      console.error('Erro:', error);
      req.session.mensagemErro = 'Erro ao carregar evidência.';
      res.redirect('/professor/desafios/avaliar');
    }
  },

  // Avaliar desafio
  avaliarDesafio: async (req, res) => {
    try {
      const { status, feedbackProfessor } = req.body;
      const evidencia = await EvidenciaDesafio.findOne({
        where: { id: req.params.id },
        include: [{
          model: RespostaAtividade,
          as: 'respostaAtividade'
        }]
      });

      if (!evidencia) {
        req.session.mensagemErro = 'Evidência não encontrada.';
        return res.redirect('/professor/desafios/avaliar');
      }

      evidencia.status = status;
      evidencia.feedbackProfessor = feedbackProfessor || null;
      await evidencia.save();

      // Atualizar pontuação
      const resposta = evidencia.respostaAtividade;
      if (status === 'aprovado') {
        resposta.pontuacao = 100;
        resposta.finalizada = true;
      } else {
        resposta.pontuacao = 0;
        resposta.finalizada = true;
      }
      await resposta.save();

      // Atualizar pontuação acumulada do aluno
      const todasRespostas = await RespostaAtividade.findAll({
        where: { alunoId: resposta.alunoId, finalizada: true }
      });
      const totalPontos = todasRespostas.reduce((sum, r) => sum + r.pontuacao, 0);
      await Usuario.update(
        { pontuacaoAcumulada: totalPontos },
        { where: { id: resposta.alunoId } }
      );

      req.session.mensagemSucesso = status === 'aprovado'
        ? 'Desafio aprovado! Pontuação registrada.'
        : 'Desafio marcado como não realizado.';
      res.redirect('/professor/desafios/avaliar');
    } catch (error) {
      console.error('Erro ao avaliar desafio:', error);
      req.session.mensagemErro = 'Erro ao avaliar desafio.';
      res.redirect('/professor/desafios/avaliar');
    }
  },

  // Relatórios
  relatorios: async (req, res) => {
    try {
      const turmas = await Turma.findAll({
        where: { professorId: req.session.usuario.id },
        include: [{ model: AlunoTurma, as: 'matriculas' }],
        order: [['nome', 'ASC']]
      });

      res.render('professor/relatorios', {
        title: 'Relatórios de Desempenho',
        turmas: turmas.map(t => t.toJSON())
      });
    } catch (error) {
      console.error('Erro:', error);
      req.session.mensagemErro = 'Erro ao carregar relatórios.';
      res.redirect('/professor/dashboard');
    }
  },

  // Relatório de uma turma
  relatorioTurma: async (req, res) => {
    try {
      const turma = await Turma.findOne({
        where: { id: req.params.id, professorId: req.session.usuario.id },
        include: [
          {
            model: AlunoTurma,
            as: 'matriculas',
            include: [{ model: Usuario, as: 'aluno', attributes: ['id', 'nome', 'email', 'pontuacaoAcumulada'] }]
          },
          {
            model: AtividadeTurma,
            as: 'atividadesAssociadas'
          }
        ]
      });

      if (!turma) {
        req.session.mensagemErro = 'Turma não encontrada.';
        return res.redirect('/professor/relatorios');
      }

      const totalAtividadesTurma = turma.atividadesAssociadas.length;

      // Para cada aluno, contar atividades realizadas e calcular média
      const relatorio = [];
      for (const matricula of turma.matriculas) {
        const aluno = matricula.aluno;
        const respostas = await RespostaAtividade.findAll({
          where: {
            alunoId: aluno.id,
            turmaId: turma.id,
            finalizada: true
          }
        });

        const atividadesRealizadas = respostas.length;
        const somaNotas = respostas.reduce((sum, r) => sum + r.pontuacao, 0);
        const pontuacaoMedia = atividadesRealizadas > 0 ? (somaNotas / atividadesRealizadas) : 0;
        const participacao = totalAtividadesTurma > 0
          ? Math.round((atividadesRealizadas / totalAtividadesTurma) * 100)
          : 0;

        relatorio.push({
          nome: aluno.nome,
          email: aluno.email,
          pontuacaoAcumulada: aluno.pontuacaoAcumulada,
          atividadesRealizadas,
          totalAtividadesTurma,
          pontuacaoMedia: pontuacaoMedia.toFixed(1),
          participacao
        });
      }

      res.render('professor/relatorioTurma', {
        title: `Relatório - ${turma.nome}`,
        turma: turma.toJSON(),
        relatorio,
        totalAtividadesTurma
      });
    } catch (error) {
      console.error('Erro no relatório:', error);
      req.session.mensagemErro = 'Erro ao gerar relatório.';
      res.redirect('/professor/relatorios');
    }
  }
};

module.exports = professorController;
