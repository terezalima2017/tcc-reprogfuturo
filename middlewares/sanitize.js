const xssFilters = require('xss-filters');

/**
 * Middleware de sanitização de entrada.
 * Remove caracteres perigosos de todos os campos de req.body, req.query e req.params
 * para prevenir ataques XSS (Cross-Site Scripting).
 */
function sanitizeInput(req, res, next) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
}

/**
 * Sanitiza recursivamente todos os valores string de um objeto.
 * @param {Object} obj - Objeto a ser sanitizado
 * @returns {Object} Objeto com valores sanitizados
 */
function sanitizeObject(obj) {
  if (typeof obj === 'string') {
    return xssFilters.inHTMLData(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized = {};
    for (const key of Object.keys(obj)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }

  return obj;
}

module.exports = sanitizeInput;
