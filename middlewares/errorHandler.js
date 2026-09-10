/**
 * Middleware central de tratamento de erros da aplicação.
 * Garante segurança (CWE-209 / OWASP A09:2021), resiliência e boas práticas de log em produção.
 */
function errorHandler(err, req, res, next) {
  // 1. Evitar loops de renderização se a resposta já começou a ser enviada ao cliente
  if (res.headersSent) {
    return next(err);
  }

  // 2. Definir o código de status HTTP numérico (padrão 500 se inválido)
  const statusRaw = err.status || err.statusCode;
  const statusCode = (typeof statusRaw === 'number' && statusRaw >= 400 && statusRaw <= 599) ? statusRaw : 500;

  // 3. Log estruturado e detalhado no servidor para fins de monitoramento e auditoria
  console.error('[SERVER ERROR LOG]', {
    timestamp: new Date().toISOString(),
    message: err.message || 'Sem mensagem descritiva',
    stack: err.stack || null,
    path: req.originalUrl || req.url,
    method: req.method,
    statusCode
  });

  // 4. Tratamento especial: Erro de tamanho de payload HTTP 413 (express.json / urlencoded)
  if (err.type === 'entity.too.large' || statusCode === 413) {
    return res.status(413).render('error', {
      title: 'Requisição Muito Grande',
      statusCode: 413,
      message: 'O tamanho da requisição excede o limite máximo permitido.'
    });
  }

  // 5. Tratamento especial: Erros do Multer (ex.: limite de tamanho de arquivo de 5MB)
  if (err.code === 'LIMIT_FILE_SIZE') {
    if (req.session) {
      req.session.mensagemErro = 'O arquivo enviado é muito grande. O limite é 5MB.';
    }
    return res.redirect(req.get('Referrer') || 'back');
  }

  // 6. Tratamento especial: Validação de extensão/tipo de arquivo de imagem
  if (err.message && err.message.includes('Apenas imagens')) {
    if (req.session) {
      req.session.mensagemErro = err.message;
    }
    return res.redirect(req.get('Referrer') || 'back');
  }

  // 7. Sanitização da mensagem exibida ao usuário (evita exposição de stack trace, SQL ou diretórios)
  let userMessage = 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.';

  if (statusCode >= 400 && statusCode < 500) {
    // Sanitiza contra vazamento acidental de consultas SQL ou caminhos de arquivos em mensagens 4xx
    const containsSensitiveInfo = err.message && (
      err.message.toLowerCase().includes('select ') ||
      err.message.toLowerCase().includes('insert ') ||
      err.message.toLowerCase().includes('update ') ||
      err.message.toLowerCase().includes('delete ') ||
      err.message.includes(':\\') ||
      err.message.includes('/var/')
    );

    if (err.message && !containsSensitiveInfo) {
      userMessage = err.message;
    } else {
      userMessage = 'A requisição enviada é inválida ou não pôde ser processada.';
    }
  }

  // 8. Título dinâmico e amigável da página de erro
  let pageTitle = 'Erro no Servidor';
  if (statusCode === 404) pageTitle = 'Página Não Encontrada';
  else if (statusCode === 403) pageTitle = 'Acesso Negado';
  else if (statusCode >= 400 && statusCode < 500) pageTitle = 'Requisição Inválida';

  // 9. Renderizar a página de erro sem expor detalhes sensíveis
  return res.status(statusCode).render('error', {
    title: pageTitle,
    statusCode,
    message: userMessage
  });
}

module.exports = errorHandler;
