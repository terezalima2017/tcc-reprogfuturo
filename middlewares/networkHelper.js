/**
 * Utilitários de Rede para Detecção de IP e Ambientes NAT / Hairpin NAT
 *
 * Em ambientes escolares, múltiplos dispositivos na LAN podem acessar o servidor
 * através do IP público (Hairpin NAT) ou do IP local. Este módulo auxilia na
 * identificação correta do endereço do cliente e na validação de IPs privados.
 */

const os = require('os');

/**
 * Verifica se um endereço IP pertence às faixas privadas (RFC 1918, Loopback, Link-Local)
 * @param {string} ip Endereço IPv4 ou IPv6
 * @returns {boolean}
 */
function isPrivateIp(ip) {
  if (!ip) return false;
  // Normaliza IPv6 mapeado para IPv4 (ex: ::ffff:192.168.1.1)
  const cleanIp = ip.replace(/^::ffff:/, '');

  // Loopback
  if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost') {
    return true;
  }

  // RFC 1918 Faixas IPv4 privadas:
  // 10.0.0.0/8
  if (/^10\./.test(cleanIp)) return true;
  // 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanIp)) return true;
  // 192.168.0.0/16
  if (/^192\.168\./.test(cleanIp)) return true;
  // Link-Local 169.254.0.0/16
  if (/^169\.254\./.test(cleanIp)) return true;

  // IPv6 ULA (Unique Local Address fc00::/7) ou Link-Local (fe80::/10)
  if (/^(fc|fd|fe80)/i.test(cleanIp)) return true;

  return false;
}

/**
 * Obtém os endereços IPv4 locais das placas de rede ativas da máquina
 * @returns {Array<{interface: string, address: string}>}
 */
function getLocalNetworkAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const [name, netInterface] of Object.entries(interfaces)) {
    if (!netInterface) continue;
    for (const net of netInterface) {
      // Ignora loopback e IPv6 para a listagem principal
      if (!net.internal && net.family === 'IPv4') {
        addresses.push({
          interface: name,
          address: net.address
        });
      }
    }
  }

  return addresses;
}

/**
 * Extrai o melhor IP do cliente considerando proxies e NAT
 * @param {import('express').Request} req
 * @returns {string}
 */
function getClientIp(req) {
  if (!req) return '0.0.0.0';

  // Se houver cabeçalho X-Forwarded-For (primeiro IP é o cliente original)
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map(ip => ip.trim());
    if (ips.length > 0 && ips[0]) {
      return ips[0].replace(/^::ffff:/, '');
    }
  }

  // X-Real-IP
  if (req.headers['x-real-ip']) {
    return String(req.headers['x-real-ip']).trim().replace(/^::ffff:/, '');
  }

  // req.ip (Express) ou socket remoteAddress
  const ip = req.ip || (req.socket && req.socket.remoteAddress) || '0.0.0.0';
  return String(ip).replace(/^::ffff:/, '');
}

module.exports = {
  isPrivateIp,
  getLocalNetworkAddresses,
  getClientIp
};

