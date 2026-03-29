const { Usuario } = require('../models');

const authController = {
  // Landing page
  home: (req, res) => {
    if (req.session && req.session.usuario) {
      const tipo = req.session.usuario.tipo;
      if (tipo === 'admin') return res.redirect('/admin/dashboard');
      if (tipo === 'professor') return res.redirect('/professor/dashboard');
      return res.redirect('/aluno/dashboard');
    }
    res.render('home', { title: 'ReProgFuturo - Educação Ambiental', layout: 'main' });
  },

  // Formulário de login
  loginForm: (req, res) => {
    if (req.session && req.session.usuario) return res.redirect('/');
    res.render('auth/login', { title: 'Entrar - ReProgFuturo' });
  },

  // Processar login
  login: async (req, res) => {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        req.session.mensagemErro = 'Preencha todos os campos.';
        return res.redirect('/login');
      }

      const usuario = await Usuario.findOne({ where: { email: email.toLowerCase().trim() } });

      if (!usuario) {
        req.session.mensagemErro = 'Email ou senha incorretos.';
        return res.redirect('/login');
      }

      const senhaValida = await usuario.verificarSenha(senha);
      if (!senhaValida) {
        req.session.mensagemErro = 'Email ou senha incorretos.';
        return res.redirect('/login');
      }

      // Salvar usuário na sessão (sem a senha)
      req.session.usuario = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo
      };

      req.session.mensagemSucesso = `Bem-vindo(a), ${usuario.nome}! 🌿`;

      // Redirecionar por tipo
      if (usuario.tipo === 'admin') return res.redirect('/admin/dashboard');
      if (usuario.tipo === 'professor') return res.redirect('/professor/dashboard');
      return res.redirect('/aluno/dashboard');

    } catch (error) {
      console.error('Erro no login:', error);
      req.session.mensagemErro = 'Ocorreu um erro. Tente novamente.';
      return res.redirect('/login');
    }
  },

  // Formulário de registro
  registerForm: (req, res) => {
    if (req.session && req.session.usuario) return res.redirect('/');
    res.render('auth/register', { title: 'Cadastrar - ReProgFuturo' });
  },

  // Processar registro
  register: async (req, res) => {
    try {
      const { nome, email, senha, confirmarSenha, tipo } = req.body;

      // Validações
      if (!nome || !email || !senha || !confirmarSenha || !tipo) {
        req.session.mensagemErro = 'Preencha todos os campos.';
        return res.redirect('/register');
      }

      if (senha !== confirmarSenha) {
        req.session.mensagemErro = 'As senhas não coincidem.';
        return res.redirect('/register');
      }

      if (senha.length < 6) {
        req.session.mensagemErro = 'A senha deve ter pelo menos 6 caracteres.';
        return res.redirect('/register');
      }

      // Não permitir cadastro de admin
      if (tipo === 'admin') {
        req.session.mensagemErro = 'Não é permitido cadastrar administradores.';
        return res.redirect('/register');
      }

      if (!['aluno', 'professor'].includes(tipo)) {
        req.session.mensagemErro = 'Tipo de perfil inválido.';
        return res.redirect('/register');
      }

      // Verificar email duplicado
      const emailExiste = await Usuario.findOne({ where: { email: email.toLowerCase().trim() } });
      if (emailExiste) {
        req.session.mensagemErro = 'Este email já está cadastrado.';
        return res.redirect('/register');
      }

      // Criar usuário
      const novoUsuario = await Usuario.create({
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        senha,
        tipo
      });

      // Login automático após registro
      req.session.usuario = {
        id: novoUsuario.id,
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        tipo: novoUsuario.tipo
      };

      req.session.mensagemSucesso = `Conta criada com sucesso! Bem-vindo(a), ${novoUsuario.nome}! 🌱`;

      if (novoUsuario.tipo === 'professor') return res.redirect('/professor/dashboard');
      return res.redirect('/aluno/dashboard');

    } catch (error) {
      console.error('Erro no registro:', error);
      if (error.name === 'SequelizeValidationError') {
        req.session.mensagemErro = error.errors.map(e => e.message).join(', ');
      } else {
        req.session.mensagemErro = 'Ocorreu um erro. Tente novamente.';
      }
      return res.redirect('/register');
    }
  },

  // Logout
  logout: (req, res) => {
    req.session.destroy((err) => {
      if (err) console.error('Erro ao destruir sessão:', err);
      res.redirect('/login');
    });
  }
};

module.exports = authController;
