const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Verifica se o arquivo .env existe na raiz do projeto.
 * Se não existir, ele é gerado automaticamente a partir do .env.example
 * ou com valores seguros de desenvolvimento (SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD).
 */
function initEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');

  if (!fs.existsSync(envPath)) {
    let content = '';
    const randomSecret = crypto.randomBytes(32).toString('hex');
    const defaultEmail = 'admin@reprogfuturo.com';
    const defaultPass = 'AdminSecure#2026!';

    if (fs.existsSync(envExamplePath)) {
      content = fs.readFileSync(envExamplePath, 'utf8');
      content = content.replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET=${randomSecret}`);
      content = content.replace(/^ADMIN_EMAIL=.*$/m, `ADMIN_EMAIL=${defaultEmail}`);
      content = content.replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD=${defaultPass}`);
    } else {
      content = `# Configuração do Ambiente
NODE_ENV=development
PORT=3000
DB_STORAGE=./database.sqlite
SESSION_SECRET=${randomSecret}
ADMIN_EMAIL=${defaultEmail}
ADMIN_PASSWORD=${defaultPass}
`;
    }
    fs.writeFileSync(envPath, content, 'utf8');
    console.log('ℹ️  Arquivo .env não encontrado. Foi criado automaticamente com valores seguros de desenvolvimento.');
  }

  // Carrega as variáveis de ambiente do arquivo .env
  require('dotenv').config({ path: envPath });
}

initEnv();

module.exports = initEnv;
