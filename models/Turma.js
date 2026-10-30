const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Turma = sequelize.define('Turma', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nome: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'O nome da turma é obrigatório.' },
      len: { args: [2, 100], msg: 'O nome deve ter entre 2 e 100 caracteres.' }
    }
  },
  codigo: {
    type: DataTypes.STRING(6),
    allowNull: false,
    unique: true
  },
  escola: {
    type: DataTypes.STRING(150),
    allowNull: true,
    defaultValue: 'Escola Municipal de Ensino Fundamental'
  },
  professorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  }
}, {
  tableName: 'turmas',
  timestamps: true
});

Turma.gerarCodigo = function () {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
};

module.exports = Turma;
