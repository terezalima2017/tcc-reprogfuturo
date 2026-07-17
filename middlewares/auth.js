// Middleware de autenticação e controle de acesso

function isAuthenticated(req, res, next) {
  if (req.session && req.session.usuario) {
    res.locals.usuario = req.session.usuario;
    return next();
  }
  req.session.mensagemErro = 'Você precisa estar logado para acessar esta página.';
  return res.redirect('/login');
}

function isAdmin(req, res, next) {
  if (req.session && req.session.usuario) {
    if (req.session.usuario.tipo === 'admin') {
      return next();
    } else {
      return res.status(403).send('403 Forbidden - Acesso restrito a administradores.');
    }
  }
  req.session.mensagemErro = 'Acesso restrito a administradores.';
  return res.redirect('/login');
}

function isProfessor(req, res, next) {
  if (req.session && req.session.usuario && req.session.usuario.tipo === 'professor') {
    return next();
  }
  req.session.mensagemErro = 'Acesso restrito a professores.';
  return res.redirect('/login');
}

function isAluno(req, res, next) {
  if (req.session && req.session.usuario && req.session.usuario.tipo === 'aluno') {
    return next();
  }
  req.session.mensagemErro = 'Acesso restrito a alunos.';
  return res.redirect('/login');
}

function isProfessorOuAdmin(req, res, next) {
  if (req.session && req.session.usuario &&
    (req.session.usuario.tipo === 'professor' || req.session.usuario.tipo === 'admin')) {
    return next();
  }
  req.session.mensagemErro = 'Acesso restrito.';
  return res.redirect('/login');
}

module.exports = {
  isAuthenticated,
  isAdmin,
  isProfessor,
  isAluno,
  isProfessorOuAdmin
};
