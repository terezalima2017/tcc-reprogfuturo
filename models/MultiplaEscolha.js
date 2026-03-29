const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MultiplaEscolha = sequelize.define('MultiplaEscolha', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  atividadeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'atividades',
      key: 'id'
    }
  },
  enunciado: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'O enunciado é obrigatório.' }
    }
  },
  alternativaA: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  alternativaB: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  alternativaC: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  alternativaD: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  alternativaE: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  respostaCorreta: {
    type: DataTypes.ENUM('A', 'B', 'C', 'D', 'E'),
    allowNull: false
  }
}, {
  tableName: 'multipla_escolha_questoes',
  timestamps: false
});

module.exports = MultiplaEscolha;
