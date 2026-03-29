const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AlunoTurma = sequelize.define('AlunoTurma', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  alunoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
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
  }
}, {
  tableName: 'aluno_turmas',
  timestamps: true,
  updatedAt: false
});

module.exports = AlunoTurma;
