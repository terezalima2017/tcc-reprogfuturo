const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LixoMisterioso = sequelize.define('LixoMisterioso', {
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
  nomeLixo: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'O tipo de resíduo é obrigatório.' }
    }
  },
  imagemUrl: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'A imagem do resíduo é obrigatória.' }
    }
  },
  lixeiraCorreta: {
    type: DataTypes.ENUM('azul', 'vermelho', 'verde', 'amarelo', 'marrom'),
    allowNull: false,
    validate: {
      isIn: {
        args: [['azul', 'vermelho', 'verde', 'amarelo', 'marrom']],
        msg: 'Cor da lixeira inválida.'
      }
    }
  }
}, {
  tableName: 'lixo_misterioso_itens',
  timestamps: false
});

module.exports = LixoMisterioso;
