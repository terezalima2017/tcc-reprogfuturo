require('./config/initEnv');
const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const helmet = require('helmet');
const path = require('path');
const { sessionConfig } = require('./config/session');
const errorHandler = require('./middlewares/errorHandler');
const sanitizeInput = require('./middlewares/sanitize');

const app = express();

// Confiar no proxy da Vercel para que cookies seguros funcionem corretamente
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ===== HANDLEBARS =====
app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
  helpers: {
    eq: (a, b) => a === b,
    neq: (a, b) => a !== b,
    gt: (a, b) => a > b,
    gte: (a, b) => a >= b,
    lt: (a, b) => a < b,
    lte: (a, b) => a <= b,
    and: (a, b) => a && b,
    or: (a, b) => a || b,
    not: (a) => !a,
    json: (context) => JSON.stringify(context),
    formatDate: (date) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('pt-BR');
    },
    formatDateTime: (date) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    },
    formatDateExtenso: (date) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    },
    feedbackEmoji: (pontuacao) => {
      if (pontuacao <= 40) return '😢';
      if (pontuacao <= 60) return '😐';
      if (pontuacao <= 80) return '😊';
      return '🤩';
    },
    feedbackMensagem: (pontuacao) => {
      if (pontuacao <= 40) return 'O planeta precisa mais da sua ajuda!';
      if (pontuacao <= 60) return 'Você está começando a cuidar da natureza.';
      if (pontuacao <= 80) return 'Muito bom! Suas ações já fazem diferença.';
      return 'Excelente! Você está salvando o planeta com conhecimento!';
    },
    feedbackClasse: (pontuacao) => {
      if (pontuacao <= 40) return 'feedback-fraco';
      if (pontuacao <= 60) return 'feedback-medio';
      if (pontuacao <= 80) return 'feedback-bom';
      return 'feedback-excelente';
    },
    tipoAtividadeLabel: (tipo) => {
      const labels = {
        'lixo_misterioso': 'Lixo Misterioso',
        'caca_palavras': 'Caça-Palavras',
        'verdadeiro_falso': 'Verdadeiro ou Falso',
        'multipla_escolha': 'Múltipla Escolha',
        'desafio_diario': 'Desafio Diário'
      };
      return labels[tipo] || tipo;
    },
    tipoAtividadeIcon: (tipo) => {
      const icons = {
        'lixo_misterioso': 'bi-trash3',
        'caca_palavras': 'bi-search',
        'verdadeiro_falso': 'bi-check2-circle',
        'multipla_escolha': 'bi-list-check',
        'desafio_diario': 'bi-calendar-check'
      };
      return icons[tipo] || 'bi-activity';
    },
    corLixeira: (cor) => {
      const cores = {
        'azul': '#0077B6',
        'vermelho': '#D32F2F',
        'verde': '#2E7D32',
        'amarelo': '#F9A825',
        'marrom': '#5D4037'
      };
      return cores[cor] || '#666';
    },
    nomeLixeira: (cor) => {
      const nomes = {
        'azul': 'Papel',
        'vermelho': 'Plástico',
        'verde': 'Vidro',
        'amarelo': 'Metal',
        'marrom': 'Orgânico'
      };
      return nomes[cor] || cor;
    },
    porcentagem: (parte, total) => {
      if (!total || total === 0) return '0';
      return Math.round((parte / total) * 100);
    },
    add: (a, b) => a + b,
    subtract: (a, b) => a - b,
    multiply: (a, b) => a * b,
    divide: (a, b) => b !== 0 ? Math.round(a / b) : 0,
    range: (n) => Array.from({ length: n }, (_, i) => i),
    includes: (arr, val) => {
      if (!arr) return false;
      return Array.isArray(arr) ? arr.includes(val) : false;
    },
    select: function (value, options) {
      return options.fn(this).replace(
        new RegExp(`value="${value}"`), `value="${value}" selected`
      );
    },
    toFixed: (num, digits) => {
      if (num === null || num === undefined) return '0';
      return Number(num).toFixed(digits || 0);
    }
  }
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// ===== MIDDLEWARES DE SEGURANÇA =====
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
      connectSrc: ["'self'"]
    }
  }
}));

// ===== MIDDLEWARES =====
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));
app.use(sanitizeInput);
app.get('/css/style.css', (req, res) => {
  res.type('text/css');
  res.sendFile(path.join(__dirname, 'public', 'css', 'style.css'));
});
app.get('/js/main.js', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'js', 'main.js'));
});
app.use(express.static(path.join(__dirname, 'public')));
app.use(session(sessionConfig));

// Flash messages + dados de sessão nas views
app.use((req, res, next) => {
  res.locals.mensagemSucesso = req.session.mensagemSucesso || null;
  res.locals.mensagemErro = req.session.mensagemErro || null;
  res.locals.usuario = req.session.usuario || null;
  delete req.session.mensagemSucesso;
  delete req.session.mensagemErro;
  next();
});

// ===== ROTAS =====
const authRoutes = require('./routes/authRoutes');
const professorRoutes = require('./routes/professorRoutes');
const alunoRoutes = require('./routes/alunoRoutes');
const adminRoutes = require('./routes/adminRoutes');
const atividadeRoutes = require('./routes/atividadeRoutes');

app.use('/', authRoutes);
app.use('/professor', professorRoutes);
app.use('/aluno', alunoRoutes);
app.use('/admin', adminRoutes);
app.use('/atividade', atividadeRoutes);

// Rota 404
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Página não encontrada',
    statusCode: 404,
    message: 'A página que você procura não existe.'
  });
});

// Error handler
app.use(errorHandler);

module.exports = app;
