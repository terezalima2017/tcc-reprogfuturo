const { Usuario } = require('../models');

async function seedAdmin() {
  try {
    const adminExiste = await Usuario.findOne({ where: { email: 'admin@reprogfuturo.com' } });

    if (!adminExiste) {
      await Usuario.create({
        nome: 'Administrador',
        email: 'admin@reprogfuturo.com',
        senha: 'Admin@123',
        tipo: 'admin'
      });
      console.log('✅ Administrador padrão criado: admin@reprogfuturo.com / Admin@123');
    } else {
      console.log('ℹ️  Administrador já existe no banco de dados.');
    }
  } catch (error) {
    console.error('❌ Erro ao criar administrador padrão:', error.message);
  }
}

module.exports = seedAdmin;
