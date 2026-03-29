const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VerdadeiroFalso = sequelize.define('VerdadeiroFalso', {
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
  afirmacao: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'A afirmação é obrigatória.' }
    }
  },
  resposta: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  }
}, {
  tableName: 'verdadeiro_falso_itens',
  timestamps: false
});

module.exports = VerdadeiroFalso;
