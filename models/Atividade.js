const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Atividade = sequelize.define('Atividade', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nome: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'O nome da atividade é obrigatório.' }
    }
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'A descrição é obrigatória.' }
    }
  },
  imagemUrl: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  tipo: {
    type: DataTypes.ENUM('lixo_misterioso', 'caca_palavras', 'verdadeiro_falso', 'multipla_escolha', 'desafio_diario'),
    allowNull: false,
    validate: {
      isIn: {
        args: [['lixo_misterioso', 'caca_palavras', 'verdadeiro_falso', 'multipla_escolha', 'desafio_diario']],
        msg: 'Tipo de atividade inválido.'
      }
    }
  },
  criadorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  isTemplate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'atividades',
  timestamps: true
});

module.exports = Atividade;
