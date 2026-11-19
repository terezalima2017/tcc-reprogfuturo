const { Usuario, Atividade, AtividadeTurma, RespostaAtividade, LixoMisterioso, CacaPalavras, VerdadeiroFalso, MultiplaEscolha, DesafioDiario, Turma, AlunoTurma, sequelize } = require('../models');
const usuarioService = require('../services/usuarioService');
const upload = require('../middlewares/upload');

const adminController = {
  listarUsuarios: async (req, res) => {
    try {
      const usuarios = await Usuario.findAll({
        order: [['createdAt', 'DESC']]
      });
      res.render('admin/usuarios', {
        title: 'Gerenciar Usuários',
        usuarios: usuarios.map(u => u.toJSON())
      });
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      req.session.mensagemErro = 'Erro ao carregar usuários.';
      res.redirect('/admin/dashboard');
    }
  },

  alterarSenhaUsuario: async (req, res) => {
    try {
      const { id } = req.params;
      const { novaSenha, confirmarSenha } = req.body;

      const usuario = await usuarioService.alterarSenha(id, novaSenha, confirmarSenha);

      // Log de auditoria
      console.log(`[AUDITORIA] Administrador ${req.session.usuario.nome} (ID: ${req.session.usuario.id}) alterou a senha do usuário ${usuario.nome} (ID: ${usuario.id}) em ${new Date().toISOString()}`);

      req.session.mensagemSucesso = `Senha do usuário ${usuario.nome} alterada com sucesso!`;
      res.redirect('/admin/usuarios');
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      req.session.mensagemErro = error.message || 'Erro ao alterar a senha do usuário.';
      res.redirect('/admin/usuarios');
    }
  },
  dashboard: async (req, res) => {
    try {
      const totalUsuarios = await Usuario.count();
      const totalAlunos = await Usuario.count({ where: { tipo: 'aluno' } });
      const totalProfessores = await Usuario.count({ where: { tipo: 'professor' } });
      const totalTurmas = await Turma.count();
      const totalTemplates = await Atividade.count({ where: { isTemplate: true } });
      const totalAtividades = await Atividade.count();

      res.render('admin/dashboard', {
        title: 'Dashboard - Admin',
        totalUsuarios, totalAlunos, totalProfessores, totalTurmas, totalTemplates, totalAtividades
      });
    } catch (error) {
      console.error('Erro:', error);
      req.session.mensagemErro = 'Erro ao carregar dashboard.';
      res.redirect('/');
    }
  },

  listarAtividades: async (req, res) => {
    try {
      const atividades = await Atividade.findAll({
        include: [
          { model: Usuario, as: 'criador', attributes: ['nome', 'tipo'] },
          { model: RespostaAtividade, as: 'respostas', attributes: ['id'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      const lista = atividades.map(a => {
        const item = a.toJSON();
        item.totalRespostas = item.respostas ? item.respostas.length : 0;
        item.podeExcluir = item.totalRespostas === 0;
        return item;
      });

      res.render('admin/atividades', {
        title: 'Gerenciar Atividades',
        atividades: lista
      });
    } catch (error) {
      console.error('Erro ao listar atividades:', error);
      req.session.mensagemErro = 'Erro ao carregar atividades.';
      res.redirect('/admin/dashboard');
    }
  },

  formCriarAtividade: (req, res) => {
    res.render('admin/formAtividade', { title: 'Criar Atividade Pronta', editando: false });
  },

  criarAtividade: async (req, res) => {
    try {
      const { nome, descricao, tipo } = req.body;
      const dados = {
        nome: nome.trim(), descricao: descricao.trim(), tipo,
        criadorId: req.session.usuario.id, isTemplate: true
      };
      if (req.file) dados.imagemUrl = upload.getFileUrl(req.file);
      const atividade = await Atividade.create(dados);
      req.session.mensagemSucesso = 'Atividade template criada!';
      res.redirect(`/admin/atividades/${atividade.id}`);
    } catch (error) {
      console.error('Erro:', error);
      req.session.mensagemErro = 'Erro ao criar atividade.';
      res.redirect('/admin/atividades/criar');
    }
  },

  detalheAtividade: async (req, res) => {
    try {
      const atividade = await Atividade.findOne({
        where: { id: req.params.id },
        include: [
          { model: Usuario, as: 'criador', attributes: ['nome', 'tipo'] },
          { model: RespostaAtividade, as: 'respostas', attributes: ['id'] },
          { model: LixoMisterioso, as: 'itensLixo' },
          { model: CacaPalavras, as: 'palavras' },
          { model: VerdadeiroFalso, as: 'afirmacoes' },
          { model: MultiplaEscolha, as: 'questoes' },
          { model: DesafioDiario, as: 'tarefas' }
        ]
      });
      if (!atividade) {
        req.session.mensagemErro = 'Atividade não encontrada.';
        return res.redirect('/admin/atividades');
      }
      const atividadeJson = atividade.toJSON();
      atividadeJson.totalRespostas = atividadeJson.respostas ? atividadeJson.respostas.length : 0;
      atividadeJson.podeExcluir = atividadeJson.totalRespostas === 0;
      res.render('admin/detalheAtividade', { title: atividade.nome, atividade: atividadeJson });
    } catch (error) {
      console.error('Erro:', error);
      req.session.mensagemErro = 'Erro ao carregar atividade.';
      res.redirect('/admin/atividades');
    }
  },

  formEditarAtividade: async (req, res) => {
    try {
      const atividade = await Atividade.findOne({ where: { id: req.params.id } });
      if (!atividade) {
        req.session.mensagemErro = 'Atividade não encontrada.';
        return res.redirect('/admin/atividades');
      }
      res.render('admin/formAtividade', { title: 'Editar Atividade', atividade: atividade.toJSON(), editando: true });
    } catch (error) {
      console.error('Erro:', error);
      res.redirect('/admin/atividades');
    }
  },

  editarAtividade: async (req, res) => {
    try {
      const atividade = await Atividade.findOne({ where: { id: req.params.id } });
      if (!atividade) {
        req.session.mensagemErro = 'Atividade não encontrada.';
        return res.redirect('/admin/atividades');
      }
      const { nome, descricao } = req.body;
      atividade.nome = nome.trim();
      atividade.descricao = descricao.trim();
      if (req.file) atividade.imagemUrl = upload.getFileUrl(req.file);
      await atividade.save();
      req.session.mensagemSucesso = 'Atividade atualizada com sucesso!';
      res.redirect(`/admin/atividades/${atividade.id}`);
    } catch (error) {
      console.error('Erro:', error);
      res.redirect('/admin/atividades');
    }
  },

  excluirAtividade: async (req, res) => {
    try {
      const { id } = req.params;
      const atividade = await Atividade.findByPk(id);

      if (!atividade) {
        req.session.mensagemErro = 'Atividade não encontrada no banco de dados.';
        return res.redirect('/admin/atividades');
      }

      // Regra de Integridade: Verificar se há registros de participação, pontuações ou resultados de alunos
      const totalRespostas = await RespostaAtividade.count({ where: { atividadeId: id } });
      if (totalRespostas > 0) {
        req.session.mensagemErro = `Não é possível excluir a atividade "${atividade.nome}". Ela possui ${totalRespostas} registro(s) de participação e pontuações de alunos associados. Para preservar o histórico escolar e evitar perda indevida de informações, a atividade não pode ser excluída.`;
        return res.redirect('/admin/atividades');
      }

      // Exclusão efetiva e segura em transação
      await sequelize.transaction(async (t) => {
        // Remover associações de turmas
        await AtividadeTurma.destroy({ where: { atividadeId: id }, transaction: t });

        // Remover itens específicos dos jogos
        await LixoMisterioso.destroy({ where: { atividadeId: id }, transaction: t });
        await CacaPalavras.destroy({ where: { atividadeId: id }, transaction: t });
        await VerdadeiroFalso.destroy({ where: { atividadeId: id }, transaction: t });
        await MultiplaEscolha.destroy({ where: { atividadeId: id }, transaction: t });
        await DesafioDiario.destroy({ where: { atividadeId: id }, transaction: t });

        // Excluir efetivamente a atividade do banco de dados
        await atividade.destroy({ transaction: t });
      });

      console.log(`[AUDITORIA] Administrador ${req.session.usuario.nome} (ID: ${req.session.usuario.id}) excluiu permanentemente a atividade "${atividade.nome}" (ID: ${id}) em ${new Date().toISOString()}`);

      req.session.mensagemSucesso = `Atividade "${atividade.nome}" excluída com sucesso!`;
      return res.redirect('/admin/atividades');
    } catch (error) {
      console.error('Erro ao excluir atividade:', error);
      req.session.mensagemErro = 'Ocorreu um erro ao excluir a atividade. Tente novamente.';
      return res.redirect('/admin/atividades');
    }
  },

  adicionarItem: async (req, res) => {
    try {
      const atividadeId = req.params.id;
      const atividade = await Atividade.findOne({ where: { id: atividadeId, isTemplate: true } });
      if (!atividade) {
        req.session.mensagemErro = 'Atividade não encontrada.';
        return res.redirect('/admin/atividades');
      }
      switch (atividade.tipo) {
        case 'lixo_misterioso': {
          const { nomeLixo, lixeiraCorreta } = req.body;
          if (!req.file) {
            req.session.mensagemErro = 'A foto do item é obrigatória.';
            return res.redirect(`/admin/atividades/${atividadeId}`);
          }
          const imagemUrl = upload.getFileUrl(req.file);
          await LixoMisterioso.create({ atividadeId, nomeLixo, imagemUrl, lixeiraCorreta });
          break;
        }
        case 'caca_palavras': {
          const { palavra } = req.body;
          if (palavra) await CacaPalavras.create({ atividadeId, palavra: palavra.trim().toUpperCase() });
          break;
        }
        case 'verdadeiro_falso': {
          const { afirmacao, resposta } = req.body;
          await VerdadeiroFalso.create({ atividadeId, afirmacao, resposta: resposta === 'true' });
          break;
        }
        case 'multipla_escolha': {
          const { enunciado, alternativaA, alternativaB, alternativaC, alternativaD, alternativaE, respostaCorreta } = req.body;
          await MultiplaEscolha.create({ atividadeId, enunciado, alternativaA, alternativaB, alternativaC, alternativaD, alternativaE: alternativaE || null, respostaCorreta });
          break;
        }
        case 'desafio_diario': {
          const { descricaoTarefa } = req.body;
          await DesafioDiario.create({ atividadeId, descricaoTarefa });
          break;
        }
      }
      req.session.mensagemSucesso = 'Item adicionado!';
      res.redirect(`/admin/atividades/${atividadeId}`);
    } catch (error) {
      console.error('Erro:', error);
      req.session.mensagemErro = 'Erro ao adicionar item.';
      res.redirect(`/admin/atividades/${req.params.id}`);
    }
  },

  excluirItem: async (req, res) => {
    try {
      const { id: atividadeId, itemId } = req.params;
      const atividade = await Atividade.findOne({ where: { id: atividadeId, isTemplate: true } });
      if (!atividade) {
        req.session.mensagemErro = 'Atividade não encontrada.';
        return res.redirect('/admin/atividades');
      }
      const modelMap = {
        'lixo_misterioso': LixoMisterioso, 'caca_palavras': CacaPalavras,
        'verdadeiro_falso': VerdadeiroFalso, 'multipla_escolha': MultiplaEscolha,
        'desafio_diario': DesafioDiario
      };
      const Model = modelMap[atividade.tipo];
      if (Model) await Model.destroy({ where: { id: itemId, atividadeId } });
      req.session.mensagemSucesso = 'Item removido.';
      res.redirect(`/admin/atividades/${atividadeId}`);
    } catch (error) {
      console.error('Erro:', error);
      res.redirect(`/admin/atividades/${req.params.id}`);
    }
  }
};

module.exports = adminController;
