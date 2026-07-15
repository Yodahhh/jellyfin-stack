#!/bin/bash
# Configuration Firewall VPS (Gateway WireGuard)
# Split Tunneling Sécurisé :
# - Web (80, 443) -> Redirigé vers le Serveur Maison (10.100.0.4) pour Traefik
# - P2P (45454)   -> Redirigé vers Gluetun (10.100.0.2) pour qBittorrent

# Interface WAN (À adapter si différent, ex: ens3 ou eth0)
WAN_IFACE="ens3"

# IPs du réseau WireGuard (wg0)
HOME_SERVER_IP="10.100.0.4"
GLUETUN_IP="10.100.0.2"

echo "Nettoyage des anciennes règles..."
sudo iptables -t nat -D PREROUTING -i $WAN_IFACE -p tcp --dport 80 -j DNAT --to-destination $HOME_SERVER_IP:80 2>/dev/null
sudo iptables -t nat -D PREROUTING -i $WAN_IFACE -p tcp --dport 443 -j DNAT --to-destination $HOME_SERVER_IP:443 2>/dev/null
sudo iptables -t nat -D PREROUTING -i $WAN_IFACE -p tcp --dport 45454 -j DNAT --to-destination $GLUETUN_IP:45454 2>/dev/null
sudo iptables -t nat -D PREROUTING -i $WAN_IFACE -p udp --dport 45454 -j DNAT --to-destination $GLUETUN_IP:45454 2>/dev/null

echo "Application des nouvelles règles sur $WAN_IFACE..."
# Redirection Web (80/443) vers Traefik (Hôte)
sudo iptables -t nat -A PREROUTING -i $WAN_IFACE -p tcp --dport 80 -j DNAT --to-destination $HOME_SERVER_IP:80
sudo iptables -t nat -A PREROUTING -i $WAN_IFACE -p tcp --dport 443 -j DNAT --to-destination $HOME_SERVER_IP:443

# Redirection P2P (45454) vers Gluetun
sudo iptables -t nat -A PREROUTING -i $WAN_IFACE -p tcp --dport 45454 -j DNAT --to-destination $GLUETUN_IP:45454
sudo iptables -t nat -A PREROUTING -i $WAN_IFACE -p udp --dport 45454 -j DNAT --to-destination $GLUETUN_IP:45454

# Masquerade (NAT sortant)
sudo iptables -t nat -A POSTROUTING -o $WAN_IFACE -j MASQUERADE

echo "Sauvegarde des règles (nécessite iptables-persistent)..."
if command -v netfilter-persistent &> /dev/null; then
    sudo netfilter-persistent save
else
    mkdir -p /etc/iptables
    sudo iptables-save > /etc/iptables/rules.v4
fi
echo "Terminé !"
