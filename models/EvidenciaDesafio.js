const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EvidenciaDesafio = sequelize.define('EvidenciaDesafio', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  respostaAtividadeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'resposta_atividades',
      key: 'id'
    }
  },
  fotoUrl: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  fotos: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue('fotos');
      return raw ? JSON.parse(raw) : [];
    },
    set(val) {
      this.setDataValue('fotos', val ? JSON.stringify(val) : '[]');
    }
  },
  relatorio: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'O relatório descritivo é obrigatório.' }
    }
  },
  status: {
    type: DataTypes.ENUM('pendente', 'aprovado', 'rejeitado'),
    defaultValue: 'pendente'
  },
  feedbackProfessor: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'evidencia_desafios',
  timestamps: true
});

module.exports = EvidenciaDesafio;
