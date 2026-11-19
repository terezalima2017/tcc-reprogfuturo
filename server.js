const app = require('./app');
const { sequelize } = require('./models');
const { sessionStore } = require('./config/session');
const seedAdmin = require('./seeders/admin-seed');
const { getLocalNetworkAddresses } = require('./middlewares/networkHelper');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function iniciar() {
  try {
    // Testa conexão com o banco
    await sequelize.authenticate();
    console.log('✅ Conexão com o banco de dados estabelecida.');

    // Sincroniza modelos (cria tabelas se não existirem)
    await sequelize.sync();
    try {
      await sequelize.query("ALTER TABLE turmas ADD COLUMN escola VARCHAR(150);");
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
      app.listen(PORT, HOST, () => {
        console.log(`\n🌿 ReProgFuturo iniciado com sucesso!`);
        console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📡 Endereços de acesso disponíveis:`);
        console.log(`   - Local (neste computador): http://localhost:${PORT}`);
        
        const localAddresses = getLocalNetworkAddresses();
        if (localAddresses.length > 0) {
          localAddresses.forEach(net => {
            console.log(`   - Rede Escolar / LAN (${net.interface}): http://${net.address}:${PORT}`);
          });
        }
        
        if (process.env.PUBLIC_URL) {
          console.log(`   - Endereço Público / WAN: ${process.env.PUBLIC_URL}`);
        } else {
          console.log(`   - Endereço Público / WAN: http://[SEU_IP_PUBLICO]:${PORT} (via Hairpin NAT)`);
        }
        console.log(`🔍 Diagnóstico de rede disponível em: /api/rede/diagnostico\n`);
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
