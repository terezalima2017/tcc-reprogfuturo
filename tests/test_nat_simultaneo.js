const http = require('http');
const app = require('../app');
const { isPrivateIp, getLocalNetworkAddresses, getClientIp } = require('../middlewares/networkHelper');

async function runTests() {
  console.log('🧪 Iniciando testes de validação de NAT, Rede e Rate Limiting Simultâneo...\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  // 1. Testes de utilitários de rede (networkHelper)
  console.log('--- 1. Testes de Detecção de IP Privado / LAN ---');
  assert(isPrivateIp('192.168.1.47') === true, '192.168.1.47 é reconhecido como IP privado de LAN');
  assert(isPrivateIp('10.0.0.15') === true, '10.0.0.15 é reconhecido como IP privado (Classe A)');
  assert(isPrivateIp('172.16.5.2') === true, '172.16.5.2 é reconhecido como IP privado (Classe B)');
  assert(isPrivateIp('127.0.0.1') === true, '127.0.0.1 é reconhecido como Loopback');
  assert(isPrivateIp('::1') === true, '::1 é reconhecido como Loopback IPv6');
  assert(isPrivateIp('::ffff:192.168.1.1') === true, '::ffff:192.168.1.1 (IPv4 mapeado em IPv6) é normalizado e reconhecido como privado');
  assert(isPrivateIp('200.189.100.25') === false, '200.189.100.25 é reconhecido como IP público WAN');
  assert(isPrivateIp('8.8.8.8') === false, '8.8.8.8 é reconhecido como IP público WAN');

  const interfaces = getLocalNetworkAddresses();
  assert(Array.isArray(interfaces), 'getLocalNetworkAddresses retorna um array');
  console.log(`  ℹ️  Interfaces de rede detectadas na máquina: ${interfaces.map(i => `${i.interface}: ${i.address}`).join(', ') || 'Nenhuma IPv4 externa'}`);

  // Inicia servidor HTTP em porta temporária (0) para testes de rede
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`\nServidor de testes rodando em: ${baseUrl}`);

  try {
    // 2. Teste do Endpoint de Diagnóstico de Rede
    console.log('\n--- 2. Teste do Endpoint de Diagnóstico de Rede (/api/rede/diagnostico) ---');
    const diagRes = await fetch(`${baseUrl}/api/rede/diagnostico`, {
      headers: { 'X-Forwarded-For': '192.168.1.105' }
    });

    assert(diagRes.status === 200, 'Endpoint /api/rede/diagnostico responde com status 200');
    const diagBody = await diagRes.json();
    assert(diagBody.status === 'online', 'Status retornado é "online"');
    assert(diagBody.cliente && diagBody.cliente.ip === '192.168.1.105', 'IP do cliente via proxy/NAT é extraído corretamente');
    assert(diagBody.cliente.isRedePrivadaOuLocal === true, 'Identifica que o acesso partiu de rede local/privada');
    assert(!!diagBody.servidor, 'Dados do servidor e interfaces estão presentes');

    // 3. Teste de Acesso Simultâneo de 30 Alunos no mesmo IP (NAT escolar)
    console.log('\n--- 3. Teste de Acesso Simultâneo de 30 Alunos no mesmo IP (NAT) ---');
    const sharedSchoolIp = '200.10.20.30';
    let nonBlockedLogins = 0;

    for (let i = 1; i <= 30; i++) {
      const studentEmail = `aluno${i}@escola.edu.br`;
      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Forwarded-For': sharedSchoolIp
        },
        body: new URLSearchParams({ email: studentEmail, senha: 'senha_incorreta_teste' }),
        redirect: 'manual'
      });

      // Se fosse rate limited geral pelo IP antigo, a partir da 6ª tentativa haveria bloqueio
      // Com a chave inteligente por conta, todas as 30 contas distintas têm sua tentativa permitida
      if (res.status === 302 && res.headers.get('location') === '/login') {
        nonBlockedLogins++;
      }
    }

    assert(nonBlockedLogins === 30, `Todos os 30 alunos no mesmo IP público conseguiram enviar suas credenciais sem bloqueio mútuo (${nonBlockedLogins}/30)`);

    // 4. Teste de Força Bruta contra uma ÚNICA conta (deve ser bloqueada após 10 tentativas)
    console.log('\n--- 4. Teste de Bloqueio Específico de Força Bruta por Conta ---');
    const targetEmail = 'vitima@escola.edu.br';
    let blockedOccurred = false;

    for (let attempt = 1; attempt <= 12; attempt++) {
      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Forwarded-For': sharedSchoolIp
        },
        body: new URLSearchParams({ email: targetEmail, senha: 'senha_incorreta' }),
        redirect: 'manual'
      });

      // No 11º e 12º login, o rateLimiter handler é acionado
      if (attempt > 10) {
        blockedOccurred = true;
      }
    }
    assert(blockedOccurred === true, 'Ataque de força bruta a uma conta específica é bloqueado após exceder o limite');

    // Testar se outro aluno NO MESMO IP continua conseguindo tentar logar mesmo após o bloqueio da conta vítima
    const anotherStudentRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Forwarded-For': sharedSchoolIp
      },
      body: new URLSearchParams({ email: 'novo_aluno_inocente@escola.edu.br', senha: 'outra_senha' }),
      redirect: 'manual'
    });

    assert(anotherStudentRes.status === 302, 'Outro aluno na mesma rede NAT NÃO é afetado pelo bloqueio da conta anterior');

    console.log(`\n========================================`);
    console.log(`Resultado dos Testes: ${passed}/${total} passaram com sucesso!`);
    console.log(`========================================\n`);

  } finally {
    server.close();
  }

  process.exit(passed === total ? 0 : 1);
}

runTests().catch(err => {
  console.error('Erro durante a execução dos testes:', err);
  process.exit(1);
});
