const { body, validationResult } = require('express-validator');

/**
 * Middleware genérico para processar os resultados da validação.
 * Se houver erros, armazena a primeira mensagem na sessão e redireciona de volta.
 */
const verificarErros = (redirectPath) => {
  return (req, res, next) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      req.session.mensagemErro = erros.array()[0].msg;
      return res.redirect(redirectPath);
    }
    next();
  };
};

/**
 * Regras de validação para cadastro de conta (/register)
 */
const validadorRegistro = [
  body('nome')
    .trim()
    .notEmpty().withMessage('O nome completo é obrigatório.')
    .isLength({ min: 2, max: 100 }).withMessage('O nome deve ter entre 2 e 100 caracteres.'),

  body('email')
    .trim()
    .notEmpty().withMessage('O email é obrigatório.')
    .isEmail().withMessage('Informe um email válido.')
    .normalizeEmail({ gmail_remove_dots: false }) // Preserva pontos em Gmail para compatibilidade
    .isLength({ max: 150 }).withMessage('O email não pode ultrapassar 150 caracteres.'),

  body('senha')
    .notEmpty().withMessage('A senha é obrigatória.')
    .isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres.')
    .isLength({ max: 50 }).withMessage('A senha não deve ultrapassar 50 caracteres.'),

  body('confirmarSenha')
    .notEmpty().withMessage('A confirmação da senha é obrigatória.')
    .custom((value, { req }) => {
      if (value !== req.body.senha) {
        throw new Error('As senhas não coincidem.');
      }
      return true;
    }),

  body('tipo')
    .trim()
    .notEmpty().withMessage('O tipo de conta é obrigatório.')
    .isIn(['aluno', 'professor']).withMessage('Tipo de conta inválido.'),

  verificarErros('/register')
];

/**
 * Regras de validação para login (/login)
 */
const validadorLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('O email é obrigatório.')
    .isEmail().withMessage('Informe um email válido.')
    .normalizeEmail({ gmail_remove_dots: false }),

  body('senha')
    .notEmpty().withMessage('A senha é obrigatória.'),

  verificarErros('/login')
];

module.exports = {
  validadorRegistro,
  validadorLogin
};
