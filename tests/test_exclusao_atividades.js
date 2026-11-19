/**
 * Testes Automatizados da Funcionalidade de Exclusão de Atividades
 *
 * Valida:
 * 1. Exclusão segura no banco de dados (ACID transaction)
 * 2. Bloqueio de exclusão quando há registros de alunos (RespostaAtividade)
 * 3. Remoção limpa de itens filhos (LixoMisterioso, CacaPalavras, etc.) e AtividadeTurma
 * 4. Proteção de permissões de acesso (apenas Administrador pode excluir)
 * 5. Bloqueio estrito de acesso para Professores e Alunos
 */

const { sequelize, Usuario, Atividade, AtividadeTurma, RespostaAtividade, LixoMisterioso, Turma } = require('../models');
const adminController = require('../controllers/adminController');
const professorController = require('../controllers/professorController');
const { isAdmin, isProfessor } = require('../middlewares/auth');

async function executarTestes() {
  console.log('🧪 Iniciando testes de exclusão segura de atividades...\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  await sequelize.authenticate();

  // 1. Criar dados de teste
  console.log('--- 1. Preparação de Dados de Teste ---');
  let admin = await Usuario.findOne({ where: { tipo: 'admin' } });
  if (!admin) {
    admin = await Usuario.create({
      nome: 'Admin Teste',
      email: 'admin_test@escola.edu.br',
      senha: 'hash_senha_teste_123',
      tipo: 'admin'
    });
  }

  let professor = await Usuario.findOne({ where: { tipo: 'professor' } });
  if (!professor) {
    professor = await Usuario.create({
      nome: 'Prof Teste',
      email: 'prof_test@escola.edu.br',
      senha: 'hash_senha_teste_123',
      tipo: 'professor'
    });
  }

  let aluno = await Usuario.findOne({ where: { tipo: 'aluno' } });
  if (!aluno) {
    aluno = await Usuario.create({
      nome: 'Aluno Teste',
      email: 'aluno_test@escola.edu.br',
      senha: 'hash_senha_teste_123',
      tipo: 'aluno'
    });
  }

  let turma = await Turma.findOne();
  if (!turma) {
    turma = await Turma.create({
      nome: 'Turma Teste A',
      codigoAcesso: 'TESTE99',
      anoLetivo: 2026,
      professorId: professor.id
    });
  }

  // 2. Teste de Proteção de Histórico: Atividade COM respostas de alunos
  console.log('\n--- 2. Teste de Proteção contra Perda de Histórico de Alunos ---');
  const atividadeComRespostas = await Atividade.create({
    nome: 'Atividade Histórica Protegida',
    descricao: 'Atividade que já foi realizada por alunos',
    tipo: 'lixo_misterioso',
    criadorId: admin.id,
    isTemplate: true
  });

  const itemLixo = await LixoMisterioso.create({
    atividadeId: atividadeComRespostas.id,
    nomeLixo: 'Garrafa PET',
    imagemUrl: '/img/pet.png',
    lixeiraCorreta: 'vermelho'
  });

  const respostaAluno = await RespostaAtividade.create({
    alunoId: aluno.id,
    atividadeId: atividadeComRespostas.id,
    turmaId: turma.id,
    pontuacao: 100,
    finalizada: true,
    respostas: JSON.stringify([{ item: 'Garrafa PET', acerto: true }])
  });

  // Tenta excluir pelo adminController
  let fakeReq = {
    params: { id: atividadeComRespostas.id },
    session: { usuario: { id: admin.id, nome: admin.nome, tipo: 'admin' } }
  };
  let fakeRes = {
    redirect: function (url) { this.redirectUrl = url; }
  };

  await adminController.excluirAtividade(fakeReq, fakeRes);

  assert(fakeReq.session.mensagemErro !== undefined, 'Mensagem de erro é configurada informando o bloqueio');
  assert(fakeReq.session.mensagemErro && fakeReq.session.mensagemErro.includes('participação'), 'Mensagem menciona explicitamente os registros de participação de alunos');

  // Verifica no banco de dados se a atividade CONTINUA existindo
  const checagemAtividade = await Atividade.findByPk(atividadeComRespostas.id);
  assert(checagemAtividade !== null, 'A atividade COM respostas NÃO foi excluída do banco de dados');

  const checagemResposta = await RespostaAtividade.findByPk(respostaAluno.id);
  assert(checagemResposta !== null, 'O registro de resposta e pontuação do aluno foi integralmente preservado');

  // 3. Teste de Exclusão Efetiva: Atividade SEM respostas de alunos
  console.log('\n--- 3. Teste de Exclusão Efetiva no Banco de Dados (Sem Respostas) ---');
  const atividadeLivre = await Atividade.create({
    nome: 'Atividade Temporária para Exclusão',
    descricao: 'Atividade sem participações que pode ser excluída',
    tipo: 'lixo_misterioso',
    criadorId: admin.id,
    isTemplate: true
  });

  const itemLivre = await LixoMisterioso.create({
    atividadeId: atividadeLivre.id,
    nomeLixo: 'Lata de Alumínio',
    imagemUrl: '/img/lata.png',
    lixeiraCorreta: 'amarelo'
  });

  const associacaoTurma = await AtividadeTurma.create({
    atividadeId: atividadeLivre.id,
    turmaId: turma.id
  });

  fakeReq = {
    params: { id: atividadeLivre.id },
    session: { usuario: { id: admin.id, nome: admin.nome, tipo: 'admin' } }
  };
  fakeRes = {
    redirect: function (url) { this.redirectUrl = url; }
  };

  await adminController.excluirAtividade(fakeReq, fakeRes);

  assert(fakeRes.redirectUrl === '/admin/atividades', 'Redireciona para /admin/atividades após a exclusão');
  assert(fakeReq.session.mensagemSucesso !== undefined, 'Mensagem de confirmação de sucesso é emitida');

  // Verifica que a atividade foi REALMENTE removida do banco
  const checagemLivre = await Atividade.findByPk(atividadeLivre.id);
  assert(checagemLivre === null, 'A atividade foi efetivamente excluída do banco de dados (não apenas ocultada)');

  // Verifica que os itens filhos e associações foram removidos
  const checagemItem = await LixoMisterioso.findByPk(itemLivre.id);
  assert(checagemItem === null, 'Itens associados à atividade foram removidos em cascata/transação');

  const checagemAssoc = await AtividadeTurma.findByPk(associacaoTurma.id);
  assert(checagemAssoc === null, 'Associação com turma foi removida');

  // 4. Teste de Controle de Permissões (Backend)
  console.log('\n--- 4. Teste de Permissões de Acesso (Apenas Admin) ---');

  // Professor tentando middleware isAdmin
  let middlewareNextChamado = false;
  let statusResposta = 0;
  let resStatus = {
    status: function (code) {
      statusResposta = code;
      return { send: (msg) => msg, render: (view, data) => data };
    }
  };

  isAdmin(
    { session: { usuario: { id: professor.id, tipo: 'professor' } } },
    resStatus,
    () => { middlewareNextChamado = true; }
  );
  assert(middlewareNextChamado === false, 'Professor NÃO passa pelo middleware isAdmin');
  assert(statusResposta === 403, 'Professor recebe HTTP 403 Forbidden ao tentar rota de admin');

  // Aluno tentando middleware isAdmin
  middlewareNextChamado = false;
  statusResposta = 0;
  isAdmin(
    { session: { usuario: { id: aluno.id, tipo: 'aluno' } } },
    resStatus,
    () => { middlewareNextChamado = true; }
  );
  assert(middlewareNextChamado === false, 'Aluno NÃO passa pelo middleware isAdmin');
  assert(statusResposta === 403, 'Aluno recebe HTTP 403 Forbidden ao tentar rota de admin');

  // Admin tentando middleware isAdmin
  middlewareNextChamado = false;
  isAdmin(
    { session: { usuario: { id: admin.id, tipo: 'admin' } } },
    resStatus,
    () => { middlewareNextChamado = true; }
  );
  assert(middlewareNextChamado === true, 'Admin passa com sucesso pelo middleware isAdmin');

  // Professor tentando excluir através de professorController.excluirAtividade
  let profStatus = 0;
  let profRendered = null;
  const profRes = {
    status: function (code) {
      profStatus = code;
      return {
        render: function (view, data) {
          profRendered = { view, data };
        }
      };
    }
  };
  await professorController.excluirAtividade({}, profRes);
  assert(profStatus === 403, 'Tentativa de exclusão por professorController retorna HTTP 403');
  assert(profRendered && profRendered.data.message.includes('administrador'), 'Mensagem informa que apenas o administrador pode excluir atividades');

  // Limpeza dos dados de teste
  await RespostaAtividade.destroy({ where: { id: respostaAluno.id } });
  await LixoMisterioso.destroy({ where: { id: itemLixo.id } });
  await Atividade.destroy({ where: { id: atividadeComRespostas.id } });

  console.log(`\n========================================`);
  console.log(`Resultado dos Testes: ${passed}/${total} passaram com sucesso!`);
  console.log(`========================================\n`);

  return passed === total;
}

if (require.main === module) {
  executarTestes().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error('Erro nos testes:', err);
    process.exit(1);
  });
}

module.exports = executarTestes;

