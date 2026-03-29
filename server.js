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

    // Sincroniza modelos (cria tabelas)
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✅ Tabelas sincronizadas com sucesso.');

    // Sincroniza store de sessão
    await sessionStore.sync();
    console.log('✅ Store de sessões sincronizado.');

    // Seed do administrador
    await seedAdmin();

    // Inicia o servidor
    app.listen(PORT, () => {
      console.log(`🌿 ReProgFuturo rodando em http://localhost:${PORT}`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
}

iniciar();
