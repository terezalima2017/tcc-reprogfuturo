const crypto = require('crypto');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const sequelize = require('./database');

// Validação do secret de sessão
let sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ SESSION_SECRET não definido. Impossível iniciar em produção sem um secret seguro.');
    process.exit(1);
  }
  // Em desenvolvimento, gera um secret aleatório por execução
  sessionSecret = crypto.randomBytes(64).toString('hex');
  console.warn('⚠️  SESSION_SECRET não definido. Usando secret aleatório temporário (sessões serão invalidadas ao reiniciar).');
}

const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: 'sessions',
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 24 * 60 * 60 * 1000
});

// Suporte a HTTPS em produção e HTTP em redes locais / NAT escolar
const isSecureCookie = process.env.COOKIE_SECURE === 'true' ||
                       (process.env.NODE_ENV === 'production' && !!process.env.VERCEL);

const sessionConfig = {
  secret: sessionSecret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  proxy: true, // Habilita express-session a confiar em proxies e NAT para cookies
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: isSecureCookie ? true : 'auto',
    sameSite: 'lax'
  }
};

module.exports = { sessionConfig, sessionStore };
