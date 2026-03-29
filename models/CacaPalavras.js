const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CacaPalavras = sequelize.define('CacaPalavras', {
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
  palavra: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'A palavra é obrigatória.' }
    }
  }
}, {
  tableName: 'caca_palavras_palavras',
  timestamps: false
});

module.exports = CacaPalavras;
