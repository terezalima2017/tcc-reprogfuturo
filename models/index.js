const sequelize = require('../config/database');
const Usuario = require('./Usuario');
const Turma = require('./Turma');
const AlunoTurma = require('./AlunoTurma');
const Atividade = require('./Atividade');
const AtividadeTurma = require('./AtividadeTurma');
const LixoMisterioso = require('./LixoMisterioso');
const CacaPalavras = require('./CacaPalavras');
const VerdadeiroFalso = require('./VerdadeiroFalso');
const MultiplaEscolha = require('./MultiplaEscolha');
const DesafioDiario = require('./DesafioDiario');
const RespostaAtividade = require('./RespostaAtividade');
const EvidenciaDesafio = require('./EvidenciaDesafio');
const Certificado = require('./Certificado');

// ===== ASSOCIAÇÕES =====

// Usuario <-> Turma (Professor cria turmas)
Usuario.hasMany(Turma, { foreignKey: 'professorId', as: 'turmasCriadas' });
Turma.belongsTo(Usuario, { foreignKey: 'professorId', as: 'professor' });

// Usuario <-> AlunoTurma <-> Turma (Aluno pertence a turma)
Usuario.hasOne(AlunoTurma, { foreignKey: 'alunoId', as: 'matricula' });
AlunoTurma.belongsTo(Usuario, { foreignKey: 'alunoId', as: 'aluno' });
Turma.hasMany(AlunoTurma, { foreignKey: 'turmaId', as: 'matriculas' });
AlunoTurma.belongsTo(Turma, { foreignKey: 'turmaId', as: 'turma' });

// Usuario <-> Atividade (Criador)
Usuario.hasMany(Atividade, { foreignKey: 'criadorId', as: 'atividadesCriadas' });
Atividade.belongsTo(Usuario, { foreignKey: 'criadorId', as: 'criador' });

// Atividade <-> AtividadeTurma <-> Turma
Atividade.hasMany(AtividadeTurma, { foreignKey: 'atividadeId', as: 'turmasAssociadas' });
AtividadeTurma.belongsTo(Atividade, { foreignKey: 'atividadeId', as: 'atividade' });
Turma.hasMany(AtividadeTurma, { foreignKey: 'turmaId', as: 'atividadesAssociadas' });
AtividadeTurma.belongsTo(Turma, { foreignKey: 'turmaId', as: 'turma' });

// Atividade <-> Itens dos jogos
Atividade.hasMany(LixoMisterioso, { foreignKey: 'atividadeId', as: 'itensLixo' });
LixoMisterioso.belongsTo(Atividade, { foreignKey: 'atividadeId', as: 'atividade' });

Atividade.hasMany(CacaPalavras, { foreignKey: 'atividadeId', as: 'palavras' });
CacaPalavras.belongsTo(Atividade, { foreignKey: 'atividadeId', as: 'atividade' });

Atividade.hasMany(VerdadeiroFalso, { foreignKey: 'atividadeId', as: 'afirmacoes' });
VerdadeiroFalso.belongsTo(Atividade, { foreignKey: 'atividadeId', as: 'atividade' });

Atividade.hasMany(MultiplaEscolha, { foreignKey: 'atividadeId', as: 'questoes' });
MultiplaEscolha.belongsTo(Atividade, { foreignKey: 'atividadeId', as: 'atividade' });

Atividade.hasMany(DesafioDiario, { foreignKey: 'atividadeId', as: 'tarefas' });
DesafioDiario.belongsTo(Atividade, { foreignKey: 'atividadeId', as: 'atividade' });

// Usuario <-> RespostaAtividade
Usuario.hasMany(RespostaAtividade, { foreignKey: 'alunoId', as: 'respostas' });
RespostaAtividade.belongsTo(Usuario, { foreignKey: 'alunoId', as: 'aluno' });

// Atividade <-> RespostaAtividade
Atividade.hasMany(RespostaAtividade, { foreignKey: 'atividadeId', as: 'respostas' });
RespostaAtividade.belongsTo(Atividade, { foreignKey: 'atividadeId', as: 'atividade' });

// Turma <-> RespostaAtividade
Turma.hasMany(RespostaAtividade, { foreignKey: 'turmaId', as: 'respostas' });
RespostaAtividade.belongsTo(Turma, { foreignKey: 'turmaId', as: 'turma' });

// RespostaAtividade <-> EvidenciaDesafio
RespostaAtividade.hasOne(EvidenciaDesafio, { foreignKey: 'respostaAtividadeId', as: 'evidencia' });
EvidenciaDesafio.belongsTo(RespostaAtividade, { foreignKey: 'respostaAtividadeId', as: 'respostaAtividade' });

// Usuario <-> Certificado
Usuario.hasMany(Certificado, { foreignKey: 'alunoId', as: 'certificados' });
Certificado.belongsTo(Usuario, { foreignKey: 'alunoId', as: 'aluno' });

// Turma <-> Certificado
Turma.hasMany(Certificado, { foreignKey: 'turmaId', as: 'certificados' });
Certificado.belongsTo(Turma, { foreignKey: 'turmaId', as: 'turma' });

module.exports = {
  sequelize,
  Usuario,
  Turma,
  AlunoTurma,
  Atividade,
  AtividadeTurma,
  LixoMisterioso,
  CacaPalavras,
  VerdadeiroFalso,
  MultiplaEscolha,
  DesafioDiario,
  RespostaAtividade,
  EvidenciaDesafio,
  Certificado
};
