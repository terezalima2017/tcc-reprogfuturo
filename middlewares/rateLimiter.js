const rateLimit = require('express-rate-limit');

/**
 * Rate limiter para a rota POST /login.
 *
 * Limita cada IP a 5 tentativas de login por janela de 15 minutos.
 * Após exceder o limite, o usuário é redirecionado para /login com
 * uma mensagem informando o bloqueio temporário.
 *
 * Proteção contra:
 *  - Brute Force: impede que um atacante teste milhares de senhas
 *    contra uma conta específica.
 *  - Password Spraying: limita tentativas com senhas comuns contra
 *    múltiplas contas a partir do mesmo IP.
 *  - Credential Stuffing: reduz a eficácia de listas de credenciais
 *    vazadas testadas automaticamente.
 *
 * @see CWE-307  Improper Restriction of Excessive Authentication Attempts
 * @see OWASP A07:2021  Identification and Authentication Failures
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,                   // máximo de 5 tentativas por janela
  standardHeaders: true,    // cabeçalhos RateLimit-* (draft-6)
  legacyHeaders: false,     // desabilita X-RateLimit-* legados

  // Ao atingir o limite, redireciona com mensagem amigável via sessão
  handler: (req, res) => {
    req.session.mensagemErro =
      'Muitas tentativas de login. Por segurança, aguarde 15 minutos antes de tentar novamente.';
    return res.redirect('/login');
  },

  // Identifica o cliente pelo IP de origem
  keyGenerator: (req) => req.ip
});

/**
 * Rate limiter para a rota POST /register.
 *
 * Limita cada IP a 5 tentativas de registro por janela de 60 minutos.
 * Protege contra criação massiva de contas (spam de cadastros).
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutos
  max: 5,                   // máximo de 5 cadastros por janela
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    req.session.mensagemErro =
      'Muitas tentativas de cadastro. Por segurança, aguarde 1 hora antes de tentar novamente.';
    return res.redirect('/register');
  },

  keyGenerator: (req) => req.ip
});

module.exports = { loginLimiter, registerLimiter };
