const bcrypt = require('bcryptjs');
const usuarioRepository = require('../repositories/usuarioRepository');

const usuarioService = {
  /**
   * Altera a senha de um usuário.
   * Valida regras de negócio, gera o hash e persiste via repository.
   *
   * @param {number} id - ID do usuário alvo
   * @param {string} novaSenha
   * @param {string} confirmarSenha
   * @returns {Promise<object>} - O usuário atualizado
   * @throws {Error} - Com mensagem descritiva em caso de falha de validação
   */
  alterarSenha: async (id, novaSenha, confirmarSenha) => {
    const usuario = await usuarioRepository.buscarPorId(id);
    if (!usuario) {
      throw new Error('Usuário não encontrado.');
    }

    if (!novaSenha || !confirmarSenha) {
      throw new Error('Preencha todos os campos de senha.');
    }

    if (novaSenha !== confirmarSenha) {
      throw new Error('As senhas informadas não coincidem.');
    }

    if (novaSenha.length < 8) {
      throw new Error('A senha deve ter pelo menos 8 caracteres.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashSenha = await bcrypt.hash(novaSenha, salt);

    await usuarioRepository.atualizarSenha(usuario, hashSenha);

    return usuario;
  }
};

module.exports = usuarioService;
