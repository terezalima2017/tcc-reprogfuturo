const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AtividadeTurma = sequelize.define('AtividadeTurma', {
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
  turmaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'turmas',
      key: 'id'
    }
  },
  dataAtribuicao: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'atividade_turmas',
  timestamps: false
});

module.exports = AtividadeTurma;
