const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nome: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'O nome é obrigatório.' },
      len: { args: [2, 100], msg: 'O nome deve ter entre 2 e 100 caracteres.' }
    }
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: { msg: 'Este email já está cadastrado.' },
    validate: {
      isEmail: { msg: 'Informe um email válido.' },
      notEmpty: { msg: 'O email é obrigatório.' }
    }
  },
  senha: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'A senha é obrigatória.' },
      len: { args: [6, 255], msg: 'A senha deve ter pelo menos 6 caracteres.' }
    }
  },
  tipo: {
    type: DataTypes.ENUM('aluno', 'professor', 'admin'),
    allowNull: false,
    defaultValue: 'aluno',
    validate: {
      isIn: { args: [['aluno', 'professor', 'admin']], msg: 'Tipo de perfil inválido.' }
    }
  },
  pontuacaoAcumulada: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'usuarios',
  timestamps: true,
  hooks: {
    beforeCreate: async (usuario) => {
      if (usuario.senha) {
        usuario.senha = await bcrypt.hash(usuario.senha, 10);
      }
    },
    beforeUpdate: async (usuario) => {
      if (usuario.changed('senha')) {
        usuario.senha = await bcrypt.hash(usuario.senha, 10);
      }
    }
  }
});

Usuario.prototype.verificarSenha = async function (senha) {
  return bcrypt.compare(senha, this.senha);
};

module.exports = Usuario;
