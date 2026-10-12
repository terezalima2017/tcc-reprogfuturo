const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Verifica se o arquivo .env existe na raiz do projeto.
 * Se não existir e o ambiente permitir escrita, ele é gerado automaticamente
 * a partir do .env.example ou com valores seguros de desenvolvimento.
 */
function initEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');

  // Na Vercel ou ambientes serverless com sistema de arquivos somente leitura,
  // não tenta criar o arquivo .env
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (!fs.existsSync(envPath) && !isServerless && process.env.NODE_ENV !== 'production') {
    try {
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
    } catch (err) {
      console.warn('⚠️  Não foi possível gerar .env automaticamente (sistema de arquivos em modo somente leitura):', err.message);
    }
  }

  // Carrega as variáveis de ambiente do arquivo .env se ele existir
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  } else {
    require('dotenv').config();
  }
}

initEnv();

module.exports = initEnv;
