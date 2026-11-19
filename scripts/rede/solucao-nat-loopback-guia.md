# Solução Definitiva para Acesso Simultâneo Escolar e NAT Loopback (Hairpin NAT)

Este documento detalha o diagnóstico técnico, a causa raiz e as soluções implementadas no sistema **ReProgFuturo** para permitir que múltiplos alunos conectados à mesma rede escolar acessem a plataforma simultaneamente tanto pelo endereço público (WAN) quanto pelo endereço local (LAN).

---

## 1. O Diagnóstico do Problema

Durante os testes em rede escolar, identificou-se que alunos na mesma rede local não conseguiam utilizar o sistema simultaneamente através do endereço público do servidor. A investigação técnica revelou que o problema era composto por **dois fatores simultâneos**:

### Fator 1: Bloqueio na Camada de Aplicação (Rate Limiting e Sessão)
1. **Rate Limiting por IP Único:**
   - Em redes escolares com NAT, todos os 30, 40 ou mais dispositivos de uma sala de aula saem para a internet com **o mesmo IP público**.
   - O middleware de autenticação (`middlewares/rateLimiter.js`) possuía um limite rígido de 5 tentativas de login por IP em uma janela de 15 minutos e 5 cadastros por hora.
   - Assim que 5 alunos faziam login ou cadastro, o sistema interpretava as requisições legítimas dos demais alunos como um ataque de força bruta, bloqueando a escola inteira.
2. **Cookies de Sessão e Configuração de Proxy:**
   - O Express não estava com `trust proxy` ativado em ambientes locais/testes, impedindo o reconhecimento correto de proxies e balanceadores de carga.
   - O cookie de sessão exigia `secure: true` apenas quando `NODE_ENV === 'production'`, o que falhava quando o sistema era testado via HTTP em IP público.

### Fator 2: Bloqueio na Camada de Rede (Hairpin NAT / NAT Loopback)
Quando um computador dentro da rede escolar (`192.168.1.100`) tenta se conectar ao IP público da escola (`200.x.x.x:3000`) onde o servidor também está hospedado (`192.168.1.47:3000`):
```
[Aluno na LAN: 192.168.1.100] ──> [Roteador / NAT Público: 200.x.x.x:3000]
                                             │ (Port Forward / DNAT)
                                             ▼
                               [Servidor ReProgFuturo: 192.168.1.47:3000]
```
Se o roteador não tiver **Hairpin NAT (SNAT Loopback)** habilitado:
1. O servidor recebe o pacote com IP de origem `192.168.1.100`.
2. Como o servidor e o aluno estão na mesma sub-rede (`192.168.1.0/24`), o servidor responde **diretamente via switch local** para `192.168.1.100`, sem passar pelo roteador.
3. O pacote de resposta chega ao aluno com IP de origem `192.168.1.47` (IP local do servidor).
4. Porém, o navegador do aluno estava aguardando uma resposta de `200.x.x.x` (IP público). Como o IP não bate, o sistema operacional do aluno descarta o pacote e envia um `TCP RST` (conexão recusada/reiniciada).

---

## 2. Alterações Implementadas no Projeto ReProgFuturo

Para solucionar definitivamente o problema no lado da aplicação, as seguintes modificações foram realizadas no código-fonte:

### 2.1. Rate Limiter Inteligente (`middlewares/rateLimiter.js`)
- **Associação por Conta (`keyGenerator`):** O rate limit de login agora combina o IP com o e-mail da conta (`${clientIp}_${email}`). Se um aluno errar a senha repetidamente, apenas a conta dele será temporariamente bloqueada, sem prejudicar os demais alunos da rede.
- **Isenção de Sucesso (`skipSuccessfulRequests: true`):** Logins bem-sucedidos não consomem a cota de tentativas. Uma turma inteira de 50 alunos pode autenticar simultaneamente sem atingir nenhum bloqueio.
- **Capacidade para Turmas Escolares:** O limite de cadastros simultâneos por hora no mesmo IP foi ampliado para comportar turmas inteiras (150 cadastros/hora configuráveis via `.env`).

### 2.2. Sessões Adaptáveis (`config/session.js`)
- Adicionada a flag `proxy: true` ao `express-session`, garantindo que conexões encaminhadas por NAT e proxies reversos mantenham a integridade dos cookies.
- Configuração dinâmica de cookies (`secure: 'auto'`), garantindo funcionamento estável em testes HTTP sem SSL e em produção HTTPS.

### 2.3. Configuração de Host e Interfaces (`server.js`)
- O servidor agora escuta explicitamente em `HOST = '0.0.0.0'`, aceitando conexões de todas as interfaces de rede (localhost, rede local LAN e IP público via WAN).
- Ao iniciar, o servidor exibe no terminal os links diretos para cada placa de rede ativa, facilitando a identificação imediata do IP da LAN (`http://192.168.1.47:3000`).

### 2.4. Confiança em Proxies e Diagnóstico de Rede (`app.js` & `middlewares/networkHelper.js`)
- Configurado `app.set('trust proxy', 1)` para suporte nativo a proxies, Vercel e gateways com SNAT.
- Adicionada rota de diagnóstico em tempo real:
  - `GET /api/rede/diagnostico`
  - Retorna o IP do cliente, se é rede local, cabeçalhos de proxy e status do NAT.

---

## 3. Configuração da Infraestrutura de Rede na Escola

Para que a rede física da escola encaminhe corretamente os pacotes via Hairpin NAT, escolha uma das seguintes abordagens:

### Opção A: Regra de Hairpin NAT no Roteador (Recomendado se o roteador suportar)
No roteador da escola (MikroTik, pfSense, OpenWrt, Linux):
- Deve existir uma regra de **SNAT / Masquerade** para tráfego que se origina na LAN e tem como destino o IP do servidor na LAN.
- Consulte os comandos prontos para cada fabricante em:
  `scripts/rede/regras-roteadores-nat-loopback.txt`
  ou execute o script Linux em:
  `scripts/rede/configurar-hairpin-nat-linux.sh`

### Opção B: Split-Horizon DNS (Melhor Desempenho e Mais Simples)
Em redes onde o roteador fornecido pela operadora não possui suporte a Hairpin NAT:
1. Configure o servidor DNS da escola (ou o próprio roteador / Pi-hole) para resolver o domínio da escola para o IP local:
   - Fora da escola: `reprogfuturo.escola.edu.br` ➔ `IP_PUBLICO` (via DNS da internet)
   - Dentro da escola: `reprogfuturo.escola.edu.br` ➔ `192.168.1.47` (via DNS interno)
2. Vantagem: O tráfego dos alunos não sobrecarrega a CPU do roteador com traduções de NAT desnecessárias, operando na velocidade máxima da rede gigabit cabeada/Wi-Fi.

### Opção C: Liberação do Firewall do Windows no Servidor
Se o servidor estiver rodando em Windows na rede da escola:
- Execute como Administrador o script:
  `scripts/rede/configurar-firewall-windows.bat`
  para liberar a porta TCP 3000 para a rede interna.

---

## 4. Como Testar e Validar

1. Inicie o servidor:
   ```bash
   npm start
   ```
2. Em um dispositivo conectado ao Wi-Fi da escola (celular ou outro PC):
   - Acesse `http://[IP_PUBLICO]:3000/api/rede/diagnostico` (se Hairpin NAT estiver ativo no roteador) ou `http://192.168.1.47:3000/api/rede/diagnostico`.
   - Verifique se a resposta JSON retorna status `online` e o IP do cliente.
3. Teste de login simultâneo:
   - Abra abas anônimas ou múltiplos computadores na mesma sala e faça login com contas diferentes de alunos.
   - Todos os acessos serão autenticados sem bloqueio por IP.

