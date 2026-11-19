const rateLimit = require('express-rate-limit');

/**
 * Rate limiter para a rota POST /login com suporte a ambientes de rede escolar e NAT.
 *
 * Problema resolvido:
 *  Em redes escolares (NAT / Hairpin NAT), dezenas de dispositivos compartilham
 *  o mesmo IP público ou IP de gateway. Limitar estritamente por IP bloqueava toda
 *  a turma após 5 logins.
 *
 * Solução implementada:
 *  1. keyGenerator inteligente: associa a taxa de tentativas à combinação de IP + email.
 *     Dessa forma, tentativas de força bruta contra uma conta específica continuam
 *     bloqueadas após 5 falhas, mas outros alunos na mesma rede podem fazer login livremente.
 *  2. skipSuccessfulRequests: true: logins bem-sucedidos NÃO consomem o limite.
 *  3. Limite ampliado para requisições legítimas simultâneas de turmas escolares.
 *
 * @see CWE-307  Improper Restriction of Excessive Authentication Attempts
 * @see OWASP A07:2021  Identification and Authentication Failures
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_LOGIN_MAX, 10) || 10, // 10 tentativas com erro por conta/IP
  standardHeaders: true,    // cabeçalhos RateLimit-* (draft-6)
  legacyHeaders: false,     // desabilita X-RateLimit-* legados
  skipSuccessfulRequests: true, // Logins com sucesso não contam no limite
  requestWasSuccessful: (req, res) => {
    // Se o usuário foi autenticado na sessão, o login foi um sucesso
    if (req.session && req.session.usuario) return true;
    // Se redirecionou de volta para /login, houve falha de credenciais
    const location = res.getHeader ? res.getHeader('location') : null;
    if (location && (location === '/login' || location.includes('/login'))) {
      return false;
    }
    return res.statusCode < 400;
  },

  // Chave baseada em IP + email da conta alvo
  keyGenerator: (req) => {
    const clientIp = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
    const email = (req.body && req.body.email)
      ? String(req.body.email).trim().toLowerCase()
      : '';
    return email ? `${clientIp}_${email}` : clientIp;
  },

  // Ao atingir o limite, redireciona com mensagem amigável via sessão
  handler: (req, res) => {
    req.session.mensagemErro =
      'Muitas tentativas de login para esta conta. Por segurança, aguarde 15 minutos antes de tentar novamente.';
    return res.redirect('/login');
  }
});

/**
 * Rate limiter para a rota POST /register.
 *
 * Configurado com limite adaptado para turmas escolares simultâneas compartilhando
 * o mesmo IP público via NAT (ex.: 30 a 50 alunos cadastrando-se na mesma aula).
 * Protege contra criação massiva de contas (spam por bots) sem prejudicar a aula.
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutos
  max: parseInt(process.env.RATE_LIMIT_REGISTER_MAX, 10) || 150, // Até 150 cadastros por IP/hora (turma escolar)
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    req.session.mensagemErro =
      'Limite de cadastros por rede atingido temporariamente. Por segurança, aguarde alguns instantes antes de tentar novamente.';
    return res.redirect('/register');
  }
});

module.exports = { loginLimiter, registerLimiter };
