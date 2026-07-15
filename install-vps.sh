#!/bin/bash
set -e

# ============================================
# Script d'installation automatique VPS
# Déploiement Gateway WireGuard + Firewall
# ============================================

echo "======================================"
echo "🛡️  Installation VPS (WireGuard Gateway)"
echo "======================================"
echo ""

# Vérifier si lancé en root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Ce script doit être lancé en root (sudo)"
    exit 1
fi

# ============================================
# 1. Installation des paquets
# ============================================
echo "📦 Installation de WireGuard, iptables-persistent, UFW, Fail2ban..."
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y wireguard iptables-persistent ufw fail2ban curl qrencode

# ============================================
# 2. Interface WAN
# ============================================
echo ""
echo "🌐 Détection de l'interface WAN..."
DEFAULT_IFACE=$(ip route show default | awk '/default/ {print $5}')
read -p "Interface réseau principale [$DEFAULT_IFACE] : " IFACE
IFACE=${IFACE:-$DEFAULT_IFACE}

# Mettre à jour le script firewall avec l'interface correcte
if [ -f scripts/vps-firewall.sh ]; then
    sed -i "s/WAN_IFACE=\"ens3\"/WAN_IFACE=\"$IFACE\"/g" scripts/vps-firewall.sh
fi

# ============================================
# 3. Génération des clés VPS
# ============================================
echo ""
echo "🔑 Génération des clés WireGuard du VPS..."
mkdir -p /etc/wireguard
cd /etc/wireguard
wg genkey | tee privatekey | wg pubkey > publickey
chmod 600 privatekey

VPS_PRIV=$(cat privatekey)
VPS_PUB=$(cat publickey)

echo "✅ Clé publique VPS générée : $VPS_PUB"
echo "👉 Vous devrez la copier dans le .env du serveur maison (WIREGUARD_PUBLIC_KEY)"

# ============================================
# 4. Informations Peers (Gluetun & Serveur)
# ============================================
echo ""
echo "🔗 Configuration des Peers..."
read -p "Clé publique de Gluetun (wg genkey | wg pubkey) : " GLUETUN_PUB
read -p "Clé publique du Serveur maison (wg genkey | wg pubkey) : " SERVER_PUB

# ============================================
# 5. Création de wg0.conf
# ============================================
echo ""
echo "📄 Création de /etc/wireguard/wg0.conf..."

cat > /etc/wireguard/wg0.conf << EOF
[Interface]
Address = 10.100.0.1/24
ListenPort = 51820
PrivateKey = $VPS_PRIV

# Peer 1 : Gluetun (Torrent)
[Peer]
PublicKey = $GLUETUN_PUB
AllowedIPs = 10.100.0.2/32

# Peer 2 : Serveur Maison (Traefik/Web)
[Peer]
PublicKey = $SERVER_PUB
AllowedIPs = 10.100.0.4/32
EOF

chmod 600 /etc/wireguard/wg0.conf

# ============================================
# 6. Routage & IP Forwarding
# ============================================
echo ""
echo "🔄 Activation de l'IP forwarding..."
sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/g' /etc/sysctl.conf
if ! grep -q "net.ipv4.ip_forward=1" /etc/sysctl.conf; then
    echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
fi
sysctl -p

echo "🔥 Application du script Firewall (Split Tunneling)..."
if [ -f scripts/vps-firewall.sh ]; then
    bash scripts/vps-firewall.sh
else
    echo "⚠️ Le script scripts/vps-firewall.sh est introuvable."
fi

# ============================================
# 7. Sécurité (UFW)
# ============================================
echo ""
echo "🛡️ Configuration de UFW..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 51820/udp
ufw allow 45454/tcp
ufw allow 45454/udp

read -p "Activer UFW maintenant ? (O/n) : " ENABLE_UFW
if [[ ! "$ENABLE_UFW" =~ ^[nN]$ ]]; then
    ufw --force enable
    echo "✅ UFW activé"
fi

# ============================================
# 8. Démarrage de WireGuard
# ============================================
echo ""
echo "🚀 Démarrage du tunnel WireGuard..."
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0

echo ""
echo "======================================"
echo "✅ Installation VPS terminée avec succès !"
echo "======================================"
echo ""
echo "Vérification :"
wg show
echo ""
echo "⚠️  Action requise : N'oubliez pas de configurer le serveur maison avec la clé publique du VPS :"
echo "Clé publique VPS : $VPS_PUB"
