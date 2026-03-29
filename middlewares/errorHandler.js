function errorHandler(err, req, res, next) {
  console.error('Erro:', err.message);
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Ocorreu um erro interno no servidor.';

  // Erro de upload (multer)
  if (err.code === 'LIMIT_FILE_SIZE') {
    req.session.mensagemErro = 'O arquivo enviado é muito grande. O limite é 5MB.';
    return res.redirect('back');
  }

  if (err.message && err.message.includes('Apenas imagens')) {
    req.session.mensagemErro = err.message;
    return res.redirect('back');
  }

  // Renderizar página de erro amigável
  res.status(statusCode).render('error', {
    title: 'Erro',
    statusCode,
    message: process.env.NODE_ENV === 'production'
      ? 'Ocorreu um erro inesperado. Tente novamente mais tarde.'
      : message
  });
}

module.exports = errorHandler;
