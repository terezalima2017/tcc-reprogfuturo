const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RespostaAtividade = sequelize.define('RespostaAtividade', {
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
  pontuacao: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  finalizada: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  respostas: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue('respostas');
      return raw ? JSON.parse(raw) : null;
    },
    set(val) {
      this.setDataValue('respostas', val ? JSON.stringify(val) : null);
    }
  }
}, {
  tableName: 'resposta_atividades',
  timestamps: true
});

module.exports = RespostaAtividade;
