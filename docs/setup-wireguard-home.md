# Guide : Configuration de WireGuard sur le Serveur Maison

Ce guide explique comment relier votre Serveur Maison (le client) à votre VPS (la gateway).
Cette étape est **indispensable** pour que le trafic Web (Traefik) redirigé par le VPS arrive bien jusqu'à votre serveur.

## Étape 1 : Installer WireGuard
Sur votre Serveur Maison (Ubuntu/Debian) :
```bash
sudo apt update
sudo apt install -y wireguard
```

## Étape 2 : Générer les clés
```bash
sudo mkdir -p /etc/wireguard
cd /etc/wireguard
wg genkey | sudo tee privatekey | wg pubkey | sudo tee publickey
sudo chmod 600 privatekey
```
Affichez votre clé publique :
```bash
cat publickey
```
👉 **Copiez cette clé**, elle vous sera demandée lors de l'exécution de `install-vps.sh` sur le VPS.

## Étape 3 : Créer la configuration
Créez le fichier `/etc/wireguard/wg0.conf` :
```bash
sudo nano /etc/wireguard/wg0.conf
```
Collez cette configuration (remplacez les valeurs entre `< >`) :
```ini
[Interface]
# L'IP de ce serveur dans le réseau VPN
Address = 10.100.0.4/32
PrivateKey = <CONTENU_DU_FICHIER_PRIVATEKEY>

[Peer]
# Le VPS
PublicKey = <CLE_PUBLIQUE_DU_VPS>
Endpoint = IP_VPS:51820
# On autorise uniquement le trafic destiné/venant de la gateway VPS elle-même
AllowedIPs = 10.100.0.1/32
PersistentKeepalive = 25
```

## Étape 4 : Le Script Firewall Local
Pour que le serveur maison accepte correctement les paquets transférés par le VPS, appliquez la règle de redirection interne. Le script est déjà fourni dans votre kit :
```bash
sudo bash /opt/docker/scripts/server-firewall.sh
```

## Étape 5 : Démarrer l'interface
```bash
sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0
```

Vérifiez que la connexion est établie en pingant le VPS :
```bash
ping 10.100.0.1
```
