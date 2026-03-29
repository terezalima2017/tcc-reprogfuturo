const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Garante que o diretório de uploads existe
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let subDir = 'geral';

    if (req.baseUrl.includes('atividade') || req.path.includes('atividade')) {
      subDir = 'atividades';
    } else if (req.baseUrl.includes('evidencia') || req.path.includes('evidencia') || req.path.includes('desafio')) {
      subDir = 'evidencias';
    } else if (req.baseUrl.includes('lixo') || req.path.includes('lixo')) {
      subDir = 'lixos';
    }

    const dir = path.join(uploadDir, subDir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Apenas imagens são permitidas (JPG, PNG, WEBP, GIF).'));
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

module.exports = upload;
