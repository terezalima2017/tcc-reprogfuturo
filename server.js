const app = require('./app');
const { sequelize } = require('./models');
const { sessionStore } = require('./config/session');
const seedAdmin = require('./seeders/admin-seed');

const PORT = process.env.PORT || 3000;

async function iniciar() {
  try {
    // Testa conexão com o banco
    await sequelize.authenticate();
    console.log('✅ Conexão com o banco de dados estabelecida.');

    // Sincroniza modelos (cria tabelas se não existirem)
    await sequelize.sync();
    try {
      await sequelize.query("ALTER TABLE turmas ADD COLUMN escola VARCHAR(150) DEFAULT 'Escola Municipal de Ensino Fundamental';");
    } catch (_) {
      // Ignora caso a coluna já exista
    }
    console.log('✅ Tabelas sincronizadas com sucesso.');

    // Sincroniza store de sessão
    await sessionStore.sync();
    console.log('✅ Store de sessões sincronizado.');

    // Seed do administrador
    await seedAdmin();

    // Inicia o servidor (apenas se não for ambiente serverless)
    if (!process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log(`🌿 ReProgFuturo rodando em http://localhost:${PORT}`);
        console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      });
    }
  } catch (error) {
    console.error('❌ Erro ao iniciar o servidor:', error);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
}

iniciar();

// Exporta o app para a Vercel (serverless function)
module.exports = app;
