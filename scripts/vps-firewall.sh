#!/bin/bash
# Configuration Firewall VPS (Gateway)
# Split Tunneling SecurisÃ© :
# - Web/DNS -> RedirigÃ© vers Serveur Maison (10.100.0.4)
# - Torrent -> Reste sur le VPS/VPN (Sortie Suisse/Autre)

# Interface WAN (A adapter si diffÃ©rent, ex: eth0)
WAN_IFACE="ens3"

# IP du serveur AdGuard/Traefik via le VPN
HOME_SERVER_IP="10.100.0.4"
# IP du conteneur Gluetun (Torrent)
GLUETUN_IP="10.100.0.2"

echo "Nettoyage des anciennes regles..."
sudo iptables -t nat -D PREROUTING -p tcp --dport 80 -j DNAT --to-destination $GLUETUN_IP:80 2>/dev/null
sudo iptables -t nat -D PREROUTING -p tcp --dport 443 -j DNAT --to-destination $GLUETUN_IP:443 2>/dev/null
sudo iptables -t nat -D PREROUTING -p udp --dport 53 -j DNAT --to-destination $HOME_SERVER_IP:53 2>/dev/null
sudo iptables -t nat -D PREROUTING -p tcp --dport 53 -j DNAT --to-destination $HOME_SERVER_IP:53 2>/dev/null

echo "Application des nouvelles regles sur $WAN_IFACE..."
# Redirection Web (80/443) vers AdGuard/Traefik
sudo iptables -t nat -A PREROUTING -i $WAN_IFACE -p tcp --dport 80 -j DNAT --to-destination $HOME_SERVER_IP:80
sudo iptables -t nat -A PREROUTING -i $WAN_IFACE -p tcp --dport 443 -j DNAT --to-destination $HOME_SERVER_IP:443

# Redirection DNS (53) vers AdGuard
sudo iptables -t nat -A PREROUTING -i $WAN_IFACE -p udp --dport 53 -j DNAT --to-destination $HOME_SERVER_IP:53
sudo iptables -t nat -A PREROUTING -i $WAN_IFACE -p tcp --dport 53 -j DNAT --to-destination $HOME_SERVER_IP:53

# Masquerade ( NAT sortant)
sudo iptables -t nat -A POSTROUTING -o $WAN_IFACE -j MASQUERADE

echo "Sauvegarde..."
sudo netfilter-persistent save
echo "TerminÃ© !"
