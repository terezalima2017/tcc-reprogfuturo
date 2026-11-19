#!/usr/bin/env bash
# ==============================================================================
# ReProgFuturo - Script de Configuração de Hairpin NAT (NAT Loopback) no Gateway Linux
# ==============================================================================
#
# Contexto:
# Quando clientes na rede local (LAN: 192.168.1.0/24) tentam acessar o servidor
# ReProgFuturo (192.168.1.47:3000) usando o IP público do roteador (WAN),
# ocorre o problema de NAT Loopback:
#
# 1. O cliente (ex: 192.168.1.100) envia SYN para o IP Público (WAN).
# 2. O roteador faz DNAT e encaminha para o servidor (192.168.1.47).
# 3. Se não houver SNAT (Hairpin NAT), o pacote chega ao servidor com IP de origem
#    192.168.1.100.
# 4. Como 192.168.1.100 está na mesma sub-rede, o servidor responde DIRETAMENTE
#    ao cliente via switch local, com IP de origem 192.168.1.47.
# 5. O cliente estava aguardando resposta do IP Público, e NÃO de 192.168.1.47.
#    O cliente descarta a resposta e envia TCP RST. A conexão falha!
#
# Solução:
# O roteador precisa aplicar SNAT (Masquerade) para tráfego LAN -> Servidor LAN,
# fazendo o servidor responder ao roteador, que desfaz a tradução e entrega ao cliente.
# ==============================================================================

set -e

# Configurações padrão (ajuste conforme seu ambiente de rede)
LAN_IFACE="eth0"                 # Interface da rede local (LAN)
LAN_SUBNET="192.168.1.0/24"      # Sub-rede dos alunos e servidores
SERVER_IP="192.168.1.47"         # IP interno do servidor ReProgFuturo
SERVER_PORT="3000"               # Porta da aplicação
WAN_IP="${1}"                    # Passe o IP público como argumento ou detecte automaticamente

if [ -z "$WAN_IP" ]; then
    echo "Uso: sudo ./configurar-hairpin-nat-linux.sh <IP_PUBLICO_WAN>"
    echo "Exemplo: sudo ./configurar-hairpin-nat-linux.sh 203.0.113.50"
    exit 1
fi

echo "=========================================================="
echo " Configurando Hairpin NAT (NAT Loopback) para ReProgFuturo"
echo " Sub-rede LAN: $LAN_SUBNET"
echo " Servidor:     $SERVER_IP:$SERVER_PORT"
echo " IP Público:   $WAN_IP"
echo " Interface:    $LAN_IFACE"
echo "=========================================================="

# Habilita IP Forwarding no kernel caso não esteja ativo
echo 1 > /proc/sys/net/ipv4/ip_forward
sysctl -w net.ipv4.ip_forward=1 >/dev/null

# 1. DNAT: Redireciona tráfego vindo da LAN destinado ao IP público para o servidor interno
iptables -t nat -A PREROUTING -d "$WAN_IP" -p tcp --dport "$SERVER_PORT" -j DNAT --to-destination "$SERVER_IP:$SERVER_PORT"

# 2. SNAT (Hairpin NAT / Masquerade): Mascara o IP dos clientes LAN para o IP do roteador
# Isso força o servidor a responder ao roteador, fechando o loop de NAT corretamente
iptables -t nat -A POSTROUTING -s "$LAN_SUBNET" -d "$SERVER_IP" -p tcp --dport "$SERVER_PORT" -j MASQUERADE

# 3. FORWARD: Permite o tráfego encaminhado
iptables -A FORWARD -p tcp -d "$SERVER_IP" --dport "$SERVER_PORT" -m state --state NEW,ESTABLISHED,RELATED -j ACCEPT

echo "✅ Regras de iptables aplicadas com sucesso!"
echo "Regras ativas no nat POSTROUTING:"
iptables -t nat -L POSTROUTING -n -v | grep "$SERVER_IP" || true
echo ""
echo "Dica: Para persistir as regras no Debian/Ubuntu, instale 'iptables-persistent' ou execute:"
echo "sudo iptables-save > /etc/iptables/rules.v4"

