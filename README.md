# 🎬 Stack Jellyfin Complète (Production-Ready)

Stack Docker complète pour serveur média personnel avec Jellyfin, gestion automatique des téléchargements (ARR), VPN WireGuard, reverse proxy HTTPS, et dashboard.

**20 services Docker** — prêt à déployer sur un serveur Linux.

## 🚀 Installation Rapide

### Prérequis
- Serveur Linux (Ubuntu/Debian recommandé)
- Accès root (sudo)
- Nom de domaine avec accès DNS (Infomaniak, Cloudflare, OVH...)
- VPS avec IP publique (pour le VPN WireGuard)
- Port UDP 51820 ouvert sur votre box internet

### Installation automatique

```bash
# Cloner le repo
git clone <URL_DU_REPO> jellyfin-stack
cd jellyfin-stack

# Lancer l'installation
sudo ./install.sh
```

Le script va :
1. ✅ Installer Docker et Docker Compose
2. ✅ Créer la structure de dossiers (médias + configs)
3. ✅ Configurer l'environnement (.env)
4. ✅ Demander votre domaine et email
5. ✅ Préparer Traefik pour les certificats SSL
6. ✅ Configurer le cron watchdog VPN
7. ✅ Copier les fichiers dans /opt/docker/

## 📦 Services Inclus (20 conteneurs)

### 🎥 Médias & Streaming
| Service | Description | URL |
|---|---|---|
| **Jellyfin** | Serveur média (comme Plex mais open-source) | `jellyfin.votredomaine.fr` |
| **Jellyseerr** | Interface de demandes films/séries | `requests.votredomaine.fr` |
| **jfa-go** | Gestion des invitations Jellyfin | `invite.votredomaine.fr` |

### 📥 Stack ARR (Gestion automatique)
| Service | Description | URL |
|---|---|---|
| **Radarr** | Gestion films | `radarr.votredomaine.fr` |
| **Sonarr** | Gestion séries | `sonarr.votredomaine.fr` |
| **Prowlarr** | Gestionnaire d'indexeurs torrents | `prowlarr.votredomaine.fr` |
| **Bazarr** | Sous-titres automatiques | `bazarr.votredomaine.fr` |
| **Bookshelf** | Gestion livres (fork Readarr) | `lazy.votredomaine.fr` |

### ⬇️ Téléchargement
| Service | Description | URL |
|---|---|---|
| **qBittorrent** | Client torrent (via VPN) | `qbittorrent.votredomaine.fr` |
| **Ygege** | Indexeur YGGTorrent (IP Freebox) | `ygege.votredomaine.fr` |
| **Ygege-VPN** | Indexeur YGGTorrent (IP VPS) | `ygege-vpn.votredomaine.fr` |
| **FlareSolverr** | Bypass Cloudflare pour Prowlarr | Port 8191 (interne) |
| **Autobrr** | Automatisation torrents (IRC/RSS) | `autobrr.votredomaine.fr` |
| **Cross-seed** | Cross-seeding automatique | — (interne) |

### 🏗️ Infrastructure
| Service | Description | URL |
|---|---|---|
| **Traefik** | Reverse proxy HTTPS automatique | `traefik.votredomaine.fr` |
| **Gluetun** | Gateway VPN (WireGuard → VPS) | — (interne) |
| **Homepage** | Dashboard central | `home.votredomaine.fr` |
| **HomeAssistant** | Domotique | `assistant.votredomaine.fr` |
| **Watchtower** | Mises à jour auto (toutes les 48h) | — (interne) |
| **Recyclarr** | Sync TRaSH Guides → Sonarr/Radarr | — (cron @daily) |

## 🌐 Architecture Réseau

```
Internet
   │
   ▼
[Box Internet (Freebox)]
   │ Port UDP 51820 → Serveur maison (WireGuard)
   │ 
   ├──► [VPS (IP publique)]
   │        └── WireGuard serveur (10.100.0.1:51820)
   │             └── Tunnel VPN ◄────────────────────┐
   │                                                  │
   └──► [Serveur Maison]                             │
            ├── Gluetun (10.100.0.2) ───────────────►┘
            ├── Docker (traefik_network - bridge)
            └── /mnt/media (stockage)
```

### Flux du trafic web
```
Utilisateur → DNS (*.votredomaine.fr) → IP VPS
  → iptables VPS (DNAT :80/:443 → 10.100.0.4)
  → Tunnel WireGuard → Serveur maison
  → Traefik → Service Docker
```

### Chaîne de téléchargement
```
Utilisateur (Jellyseerr)
    ↓ Demande film/série
Sonarr / Radarr
    ↓ Cherche releases
Prowlarr
    ├── ygege (IP Freebox) ──────────→ YGG Torrent
    ├── ygege-vpn (IP VPS/Gluetun) → YGG Torrent (compte 2)
    └── FlareSolverr (bypass CF)
         ↓ Résultat → Sonarr/Radarr envoient le torrent à
qBittorrent (réseau Gluetun, IP VPS pour le P2P)
    ↓ Télécharge dans /mnt/media/downloads
Sonarr/Radarr (import automatique)
    ↓ Déplace vers /mnt/media/series ou /mnt/media/movies
Jellyfin ← Bazarr ajoute les sous-titres
    ↓ Stream vers l'utilisateur
```

## ⚙️ Configuration Détaillée

### 1. Environnement (.env)

Après installation, éditez `.env` :

```bash
nano /opt/docker/.env
```

Variables à remplir :

| Variable | Où la trouver |
|---|---|
| `INFOMANIAK_ACCESS_TOKEN` | [Infomaniak API Dashboard](https://manager.infomaniak.com/v3/ng/profile/api/dashboard) |
| `WIREGUARD_PRIVATE_KEY` | `wg genkey` sur le serveur |
| `WIREGUARD_PUBLIC_KEY` | Clé publique du VPS |
| `WIREGUARD_ENDPOINT_IP` | IP publique du VPS |
| `YGG_USERNAME_1` / `YGG_PASSWORD_1` | Compte YGG (IP Freebox) |
| `YGG_USERNAME_2` / `YGG_PASSWORD_2` | Compte YGG (IP VPS) |
| `HOMEPAGE_VAR_*` | Clés API générées au 1er démarrage de chaque service |

### 2. Traefik (certificats SSL)

Le fichier `traefik/traefik.yml` est pré-configuré pour Infomaniak.

**Pour un autre DNS provider**, modifiez la section `certificatesResolvers` :

**Cloudflare :**
```yaml
certificatesResolvers:
  letsencrypt:
    acme:
      email: votre-email@exemple.com
      storage: /acme.json
      dnsChallenge:
        provider: cloudflare
```

Providers supportés : voir [Documentation Traefik](https://doc.traefik.io/traefik/https/acme/#providers)

### 3. DNS

Pointez `*.votredomaine.fr` vers l'IP de votre VPS :

```
@    A    → IP_VPS
*    A    → IP_VPS
```

> Voir `docs/setup-infomaniak.md` pour les instructions détaillées.

### 4. VPS (WireGuard)

Le VPS fait office de gateway WireGuard avec split tunneling :
- Trafic web → redirigé vers le serveur maison
- Trafic P2P → reste sur le VPS (IP suisse/autre)

> Voir `docs/setup-vps.md` pour l'installation complète.

### 5. Box internet (Freebox)

Rediriger le port UDP 51820 vers le serveur maison.

> Voir `docs/setup-freebox.md` pour les instructions.

### 6. Démarrage

```bash
cd /opt/docker
docker compose up -d
```

Vérifier les logs :
```bash
docker compose logs -f
```

## 📋 Configuration Post-Installation

### 1. Prowlarr (en premier !)
1. Accéder à `https://prowlarr.votredomaine.fr`
2. Créer un compte admin
3. Ajouter vos indexeurs torrents (ygege, ygege-vpn via FlareSolverr)
4. Aller dans **Settings > Apps**
5. Ajouter Radarr et Sonarr :
   - Radarr : `http://radarr:7878`
   - Sonarr : `http://sonarr:8989`

### 2. Radarr & Sonarr
1. Configurer le client de téléchargement : qBittorrent
   - Host : `gluetun` (pas qbittorrent ! car network_mode: service:gluetun)
   - Port : `8080`
   - Username/Password : à définir dans qBittorrent
2. **IMPORTANT** : Activer "Use Hardlinks" dans **Settings > Media Management**
3. Configurer les chemins :
   - Films : `/media/movies`
   - Séries : `/media/series`
   - Downloads : `/media/downloads`

### 3. qBittorrent
1. Mot de passe temporaire dans les logs : `docker logs qbittorrent 2>&1 | grep "temporary password"`
2. **Changer le mot de passe immédiatement** dans Tools > Web UI
3. Configurer le chemin de téléchargement : `/media/downloads`
4. Activer "Keep incomplete torrents in" : `/media/downloads/incomplete`
5. Vérifier l'IP de sortie : doit être l'IP du VPS (pas votre IP réelle)

### 4. Jellyfin
1. Créer un compte admin
2. Ajouter des bibliothèques :
   - Films : `/media/movies`
   - Séries : `/media/series`
3. Activer l'accélération matérielle (Intel QSV) si GPU disponible

### 5. Bazarr
1. Configurer les connexions vers Sonarr (`http://sonarr:8989`) et Radarr (`http://radarr:7878`)
2. Ajouter des fournisseurs de sous-titres (OpenSubtitles, Addic7ed, etc.)

### 6. Homepage Dashboard
1. Éditer les fichiers dans `/opt/docker/homepage/`
2. Remplir les clés API dans `/opt/docker/homepage/.env` (ou `/opt/docker/.env`)
3. Les widgets se connectent aux services via leur nom Docker

## 🗂️ Structure des Dossiers

```
/mnt/media/                     # Stockage média
├── downloads/                  # Téléchargements qBittorrent
│   ├── incomplete/             # Torrents en cours
│   └── watch/                  # Dossier watch (cross-seed)
├── movies/                     # Films (géré par Radarr)
├── series/                     # Séries (géré par Sonarr)
├── books/                      # Livres (géré par Bookshelf)
└── backups/                    # Sauvegardes

/opt/docker/                    # Configuration Docker
├── docker-compose.yml          # Fichier principal
├── .env                        # Secrets
├── .gitignore                  # Exclusions Git
├── traefik/                    # Config Traefik
│   ├── traefik.yml             # Config statique
│   ├── config.yml              # Config dynamique (middlewares)
│   └── acme.json               # Certificats SSL (chmod 600)
├── scripts/                    # Scripts de maintenance
│   ├── gluetun-watch.sh        # Watchdog tunnel VPN (cron 5min)
│   ├── backup-config.sh        # Sauvegarde .env + compose + git
│   ├── server-firewall.sh      # Règles iptables serveur
│   └── vps-firewall.sh         # Règles iptables VPS
└── [service]/                  # Un dossier par service = /config
```

**⚠️ IMPORTANT :** Tous les dossiers média doivent être sur le **même disque physique** pour que les Hardlinks fonctionnent (économie d'espace).

## 🔒 Sécurité

- ✅ Changer **TOUS** les mots de passe par défaut
- ✅ Ne jamais exposer directement les services sans Traefik
- ✅ Utiliser des mots de passe forts (20+ caractères)
- ✅ Activer 2FA quand disponible
- ✅ Le `.env` ne doit **jamais** être commité dans Git
- ✅ Vérifier que `acme.json` est bien en `chmod 600`
- ✅ Le trafic P2P passe exclusivement par le VPN (Gluetun)

## 🔄 Mises à Jour

Watchtower met à jour automatiquement les conteneurs toutes les 48h (sauf traefik, gluetun et qbittorrent qui sont en mise à jour manuelle).

Pour mettre à jour manuellement :
```bash
cd /opt/docker
docker compose pull
docker compose up -d
```

## 🆘 Dépannage

### Le tunnel VPN ne fonctionne pas
```bash
# Vérifier les logs Gluetun
docker logs gluetun --tail 30

# Tester l'IP de sortie (doit retourner IP du VPS)
docker exec gluetun curl ifconfig.me

# Redémarrer le tunnel
docker compose restart gluetun qbittorrent
```

### Les certificats SSL ne fonctionnent pas
- Vérifier que `*.votredomaine.fr` pointe bien vers l'IP du VPS
- Vérifier les logs Traefik : `docker compose logs traefik`
- S'assurer que le token API DNS est correct dans `.env`
- Vérifier que `acme.json` existe et a les bonnes permissions

### Hardlinks ne fonctionnent pas
```bash
# Vérifier que downloads et movies sont sur le même disque
df -h /mnt/media
# Vérifier les inodes (même inode = hardlink)
ls -li /mnt/media/movies/un_film.mkv
```

### qBittorrent utilise la mauvaise IP
```bash
# Vérifier que qBittorrent passe bien par Gluetun
docker exec gluetun curl ifconfig.me
# Si pas la bonne IP → redémarrer
docker compose restart gluetun qbittorrent
```

### Espace disque
```bash
df -h /mnt/media              # État stockage
docker system df               # Utilisation Docker
docker system prune -f          # Nettoyer images inutilisées
```

## 📚 Documentation complémentaire

| Guide | Description |
|---|---|
| `docs/setup-freebox.md` | Configuration de la Freebox |
| `docs/setup-infomaniak.md` | Configuration du domaine Infomaniak |
| `docs/setup-vps.md` | Configuration du VPS WireGuard |
| [TRaSH Guides](https://trash-guides.info/) | Configuration avancée ARR |
| [Servarr Wiki](https://wiki.servarr.com/) | Documentation officielle Sonarr/Radarr |
| [Jellyfin Docs](https://jellyfin.org/docs/) | Documentation Jellyfin |

---

**Bon streaming ! 🍿**
