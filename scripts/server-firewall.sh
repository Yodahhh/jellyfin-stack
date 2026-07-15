#!/bin/bash
# Configuration Firewall Serveur Local
# Permet l'acces distant via le VPN (Gateway 10.100.0.1 -> Host 10.100.0.4)

# IP de la Gateway VPN (VPS)
VPN_GATEWAY="10.100.0.1"
# IP locale de ce serveur (Interface WireGuard)
MY_VPN_IP="10.100.0.4"

echo "Application de la regle DNAT pour le trafic entrant du VPN..."
sudo iptables -t nat -A PREROUTING -d $VPN_GATEWAY -j DNAT --to-destination $MY_VPN_IP

echo "Sauvegarde..."
sudo netfilter-persistent save
echo "Regles appliquees."
