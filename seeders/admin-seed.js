const { Usuario } = require('../models');

async function seedAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminSenha = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminSenha) {
      console.warn('⚠️  Variáveis ADMIN_EMAIL e ADMIN_PASSWORD não definidas. Seed do admin ignorado.');
      return;
    }

    const adminExiste = await Usuario.findOne({ where: { email: adminEmail } });

    if (!adminExiste) {
      await Usuario.create({
        nome: 'Administrador',
        email: adminEmail,
        senha: adminSenha,
        tipo: 'admin'
      });
      console.log('✅ Administrador padrão criado com sucesso.');
    } else {
      console.log('ℹ️  Administrador já existe no banco de dados.');
    }
  } catch (error) {
    console.error('❌ Erro ao criar administrador padrão:', error.message);
  }
}

module.exports = seedAdmin;
