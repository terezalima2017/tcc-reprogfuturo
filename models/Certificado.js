const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Certificado = sequelize.define('Certificado', {
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
  },
  pontuacaoMedia: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  arquivoUrl: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  geradoEm: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'certificados',
  timestamps: false
});

module.exports = Certificado;
