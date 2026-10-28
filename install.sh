#!/bin/bash
set -e

# ============================================
# Script d'installation automatique
# Stack Jellyfin + ARR complète (20 services)
# ============================================

echo "======================================"
echo "🎬 Installation Stack Média Automatisée"
echo "    20 services Docker inclus"
echo "======================================"
echo ""

# Vérifier si lancé en root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Ce script doit être lancé en root (sudo)"
    exit 1
fi

# ============================================
# 1. Installation Docker
# ============================================
echo "📦 Installation de Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    
    # Ajouter l'utilisateur au groupe docker
    if [ -n "$SUDO_USER" ]; then
        usermod -aG docker $SUDO_USER
        echo "✅ Utilisateur $SUDO_USER ajouté au groupe docker"
    fi
else
    echo "✅ Docker déjà installé ($(docker --version))"
fi

# ============================================
# 2. Vérification Docker Compose
# ============================================
echo ""
echo "📦 Vérification de Docker Compose..."
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose non disponible"
    echo "Installez manuellement : https://docs.docker.com/compose/install/"
    exit 1
else
    echo "✅ Docker Compose installé ($(docker compose version --short))"
fi

# ============================================
# 3. Configuration des dossiers
# ============================================
echo ""
echo "📁 Création de la structure de dossiers..."

# Demander le chemin de stockage des médias
read -p "Chemin de stockage des médias [/mnt/media] : " MEDIA_PATH
MEDIA_PATH=${MEDIA_PATH:-/mnt/media}

# Créer la structure
mkdir -p "$MEDIA_PATH"/{downloads,downloads/incomplete,downloads/watch,movies,series,books,backups}

# Créer les dossiers de config Docker
mkdir -p /opt/docker/{traefik,qbittorrent,prowlarr,sonarr,radarr,bookshelf,jellyseerr,jellyfin,jfa-go,bazarr,ygege,ygege-vpn,recyclarr,autobrr,cross-seed,homepage,homeassistant,flaresolverr,tvproxy}

# Permissions
chown -R 1000:1000 "$MEDIA_PATH"
chown -R 1000:1000 /opt/docker

echo "✅ Structure média créée :"
echo "   - $MEDIA_PATH/downloads (+ incomplete, watch)"
echo "   - $MEDIA_PATH/movies"
echo "   - $MEDIA_PATH/series"
echo "   - $MEDIA_PATH/books"
echo "   - $MEDIA_PATH/backups"
echo ""
echo "✅ Structure config Docker créée dans /opt/docker/"

# Mettre à jour le docker-compose avec le bon chemin
if [ "$MEDIA_PATH" != "/mnt/media" ]; then
    sed -i "s|/mnt/media|$MEDIA_PATH|g" docker-compose.yml
    echo "✅ Chemin média mis à jour dans docker-compose.yml"
fi

# ============================================
# 4. Configuration initiale
# ============================================
echo ""
echo "⚙️  Configuration initiale..."

# Copier .env.example vers .env si n'existe pas
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Fichier .env créé depuis .env.example"
    echo ""
    echo "⚠️  IMPORTANT : Éditez le fichier .env avec vos credentials !"
    echo "   nano /opt/docker/.env"
else
    echo "ℹ️  Fichier .env déjà existant"
fi

# Créer acme.json pour Traefik (certificats SSL)
touch /opt/docker/traefik/acme.json
chmod 600 /opt/docker/traefik/acme.json
echo "✅ Fichier acme.json créé (chmod 600) pour les certificats SSL"

# Copier les configs Traefik
cp traefik/traefik.yml /opt/docker/traefik/traefik.yml
cp traefik/config.yml /opt/docker/traefik/config.yml
echo "✅ Configs Traefik copiées"

# Copier les scripts
mkdir -p /opt/docker/scripts
cp scripts/*.sh /opt/docker/scripts/
chmod +x /opt/docker/scripts/*.sh
echo "✅ Scripts de maintenance copiés"

# Copier TVProxy
mkdir -p /opt/docker/tvproxy
cp tvproxy/* /opt/docker/tvproxy/
echo "✅ Fichiers TVProxy copiés"

# ============================================
# 5. Configuration Traefik (domaine)
# ============================================
echo ""
echo "🔧 Configuration du domaine..."
read -p "Votre nom de domaine (ex: exemple.fr) : " DOMAIN

if [ -n "$DOMAIN" ]; then
    # Remplacer yodah.fr par le domaine de l'utilisateur dans tous les fichiers
    sed -i "s/yodah\.fr/$DOMAIN/g" docker-compose.yml
    sed -i "s/yodah\.fr/$DOMAIN/g" /opt/docker/traefik/config.yml
    echo "✅ Domaine configuré : $DOMAIN"
else
    DOMAIN="yodah.fr"
    echo "⚠️  Aucun domaine saisi, gardez yodah.fr par défaut (à changer manuellement)"
fi

# ============================================
# 6. Configuration Email Traefik
# ============================================
echo ""
read -p "Votre email pour les certificats SSL (Let's Encrypt) : " EMAIL

if [ -n "$EMAIL" ]; then
    sed -i "s/votre-email@example.com/$EMAIL/g" /opt/docker/traefik/traefik.yml
    echo "✅ Email configuré pour ACME : $EMAIL"
else
    echo "⚠️  Aucun email saisi. Éditez /opt/docker/traefik/traefik.yml manuellement"
fi

# ============================================
# 7. Installation du cron watchdog VPN
# ============================================
echo ""
echo "⏰ Configuration du watchdog VPN (cron)..."
CRON_LINE="*/5 * * * * /opt/docker/scripts/gluetun-watch.sh >> /var/log/gluetun-watch.log 2>&1"

# Vérifier si le cron existe déjà
if crontab -l 2>/dev/null | grep -q "gluetun-watch"; then
    echo "ℹ️  Cron watchdog VPN déjà configuré"
else
    (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
    echo "✅ Cron watchdog VPN ajouté (toutes les 5 min)"
fi

# ============================================
# 8. Copier le docker-compose dans /opt/docker
# ============================================
echo ""
echo "📋 Copie du docker-compose dans /opt/docker..."
cp docker-compose.yml /opt/docker/docker-compose.yml
cp .env /opt/docker/.env 2>/dev/null || true
cp .gitignore /opt/docker/.gitignore 2>/dev/null || true
echo "✅ Fichiers copiés dans /opt/docker/"

# ============================================
# 9. Résumé et prochaines étapes
# ============================================
echo ""
echo "======================================"
echo "✅ Installation terminée !"
echo "======================================"
echo ""
echo "📋 Prochaines étapes :"
echo ""
echo "1. Éditez le fichier .env avec vos credentials :"
echo "   nano /opt/docker/.env"
echo ""
echo "2. Configurez votre DNS provider dans /opt/docker/traefik/traefik.yml"
echo "   (voir docs/setup-infomaniak.md)"
echo ""
echo "3. Configurez votre VPS WireGuard"
echo "   (voir docs/setup-vps.md)"
echo ""
echo "4. Configurez votre box internet"
echo "   (voir docs/setup-freebox.md)"
echo ""
echo "5. Lancez la stack :"
echo "   cd /opt/docker && docker compose up -d"
echo ""
echo "6. Accédez aux services :"
echo "   - Jellyfin      : https://jellyfin.$DOMAIN"
echo "   - Jellyseerr    : https://requests.$DOMAIN"
echo "   - Radarr        : https://radarr.$DOMAIN"
echo "   - Sonarr        : https://sonarr.$DOMAIN"
echo "   - Prowlarr      : https://prowlarr.$DOMAIN"
echo "   - Bazarr        : https://bazarr.$DOMAIN"
echo "   - qBittorrent   : https://qbittorrent.$DOMAIN"
echo "   - Homepage      : https://home.$DOMAIN"
echo "   - Bookshelf     : https://lazy.$DOMAIN"
echo "   - Autobrr       : https://autobrr.$DOMAIN"
echo "   - Invitations   : https://invite.$DOMAIN"
echo "   - HomeAssistant : https://assistant.$DOMAIN"
echo "   - Traefik       : https://traefik.$DOMAIN"
echo ""
echo "⚠️  N'oubliez pas de :"
echo "   - Pointer vos sous-domaines (*.${DOMAIN}) vers l'IP de votre VPS"
echo "   - Changer TOUS les mots de passe par défaut"
echo "   - Configurer Prowlarr en premier (indexeurs + connexion Sonarr/Radarr)"
echo ""
echo "📚 Documentation complète : voir README.md et docs/"
echo ""
