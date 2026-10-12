const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

/**
 * Determina o subdiretório/pasta baseado na rota
 */
function getSubDir(req) {
  const url = (req.baseUrl || '') + (req.path || '');
  if (url.includes('evidencia') || url.includes('desafio')) {
    return 'evidencias';
  } else if (url.includes('lixo')) {
    return 'lixos';
  } else if (url.includes('atividade')) {
    return 'atividades';
  }
  return 'geral';
}

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Apenas imagens são permitidas (JPG, PNG, WEBP, GIF).'));
};

let storage;

if (isCloudinaryConfigured()) {
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      const subDir = getSubDir(req);
      const cleanName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e4);
      return {
        folder: `reprogfuturo/${subDir}`,
        public_id: `${cleanName}-${uniqueSuffix}`,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif']
      };
    }
  });
} else {
  // Fallback para disco local (desenvolvimento sem Cloudinary configurado)
  const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  } catch (err) {
    // Silencia em ambientes serverless ou sistemas com leitura exclusiva
  }

  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const subDir = getSubDir(req);
      const dir = path.join(uploadDir, subDir);
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      } catch (err) {
        // Silencia em caso de sistema somente leitura
      }
      cb(null, dir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  });
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

/**
 * Helper universal para obter a URL pública da imagem salva (Cloudinary ou local).
 * @param {object} file - Objeto de arquivo retornado pelo multer (req.file)
 * @returns {string|null} - URL completa do Cloudinary ou caminho relativo local
 */
function getFileUrl(file) {
  if (!file) return null;
  // Se veio do Cloudinary, file.path já é a URL HTTPS pública
  if (file.path && (file.path.startsWith('http://') || file.path.startsWith('https://'))) {
    return file.path;
  }
  if (file.secure_url) return file.secure_url;
  if (file.url) return file.url;

  // Fallback local caso tenha sido salvo no disco
  if (file.filename) {
    return '/uploads/atividades/' + file.filename;
  }
  return null;
}

upload.getFileUrl = getFileUrl;

module.exports = upload;
