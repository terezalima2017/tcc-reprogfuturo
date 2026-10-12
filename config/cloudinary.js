const cloudinary = require('cloudinary').v2;

// Configuração das credenciais do Cloudinary a partir de variáveis de ambiente
if (process.env.CLOUDINARY_URL) {
  // Configuração automática se fornecido CLOUDINARY_URL (formato: cloudinary://api_key:api_secret@cloud_name)
  cloudinary.config();
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

/**
 * Retorna true se as credenciais do Cloudinary estiverem devidamente configuradas.
 */
function isCloudinaryConfigured() {
  return !!(
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  );
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured
};
