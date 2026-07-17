const { Usuario, sequelize } = require('../models');

const usuarioRepository = {
  /**
   * Busca um usuário pelo ID.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  buscarPorId: async (id) => {
    return Usuario.findByPk(id);
  },

  /**
   * Atualiza a senha de um usuário dentro de uma transação.
   * @param {object} usuario - Instância do modelo Usuario
   * @param {string} hashSenha - Senha já criptografada (bcrypt)
   * @returns {Promise<void>}
   */
  atualizarSenha: async (usuario, hashSenha) => {
    await sequelize.transaction(async (t) => {
      await usuario.update({ senha: hashSenha }, { transaction: t });
    });
  }
};

module.exports = usuarioRepository;
