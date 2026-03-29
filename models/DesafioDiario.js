const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DesafioDiario = sequelize.define('DesafioDiario', {
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
  descricaoTarefa: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'A descrição da tarefa é obrigatória.' }
    }
  }
}, {
  tableName: 'desafio_diario_tarefas',
  timestamps: false
});

module.exports = DesafioDiario;
