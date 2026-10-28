# TVProxy - Passerelle IPTV & EPG Auto-hébergée pour Jellyfin

`tvproxy` est une passerelle Node.js légère (sur base Alpine) conçue pour distribuer des flux TV en direct (TNT française, chaînes suisses, belges, bouquets sport, cinéma, séries et documentaires) vers un serveur média comme **Jellyfin**, avec génération automatique du guide des programmes (**EPG XMLTV**) et logos.

---

## 🎯 Fonctionnalités clés

* **Flux continus MPEG-TS (`.ts`)** : Conversion et streaming stabilisé sans coupure ni saut de timecode.
* **Résilience réseau & Failover automatique** : Bascule transparente entre plusieurs serveurs miroirs en cas de coupure de source amont.
* **Monotonicité temporelle stricte** : Empêche tout retour en arrière temporel lors des changements de segments ou des reconnexions.
* **Guide TV filtré & normalisé (`/epg.xml`)** : Intègre les logos officiels et injecte les catégories Jellyfin standard (`Movie`, `Sports`, `News`, `Shows`).
* **Zéro consommation au repos** : Aucun flux vidéo n'est téléchargé tant qu'aucun utilisateur ne lance la lecture d'une chaîne.
* **Aucun secret / clé d'API statique requis** : Les jetons de session éphémères sont générés dynamiquement par le proxy.

---

## 🏗️ Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │                 DOCKER STACK                 │
                  │                                              │
Internet / CDN ──►│  [Gluetun VPN]  ◄── (Tunnel WireGuard CH)    │
(Flux vidéo)      │        │                                     │
                  │  [tvproxy :8899] (network_mode: gluetun)     │
                  │        │                                     │
                  │        ▼                                     │
                  │   [Jellyfin]  ◄── (M3U: http://gluetun:8899) │
                  └────────┼─────────────────────────────────────┘
                           │
                           ▼ (Transcodage / Direct Play)
                 Clients (TV Tizen, Web, Mobile)
```

---

## 🚀 Déploiement Docker Compose

Ajouter le service dans votre `docker-compose.yml` :

```yaml
services:
  # VPN Wireguard optionnel mais recommandé pour contourner les blocages FAI et géolocalisation
  gluetun:
    image: qmcgaw/gluetun:latest
    container_name: gluetun
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
    environment:
      - VPN_SERVICE_PROVIDER=custom
      - VPN_TYPE=wireguard
      - WIREGUARD_ENDPOINT_IP=${WIREGUARD_ENDPOINT_IP}
      - WIREGUARD_ENDPOINT_PORT=${WIREGUARD_ENDPOINT_PORT:-51820}
      - WIREGUARD_PRIVATE_KEY=${WIREGUARD_PRIVATE_KEY}
      - WIREGUARD_ADDRESSES=${WIREGUARD_ADDRESSES:-10.100.0.2/24}
      - FIREWALL_OUTBOUND_SUBNETS=192.168.1.0/24,172.16.0.0/12
    networks:
      - traefik_network

  # Proxy TV & EPG
  tvproxy:
    image: node:24-alpine
    container_name: tvproxy
    restart: unless-stopped
    # Attaché au réseau VPN si présent, sinon connectez-le à votre bridge Docker habituel
    network_mode: "service:gluetun"
    environment:
      - TZ=Europe/Paris
      - PORT=8899
    volumes:
      - ./tvproxy:/app:ro
    command: node /app/server.mjs
    depends_on:
      - gluetun
    labels:
      - "com.centurylinklabs.watchtower.enable=false"
```

---

## 📡 Endpoints du Proxy

* **`http://gluetun:8899/playlist.m3u`** : Liste M3U complète des chaînes avec attributs `tvg-id`, `tvg-chno`, logos et groupes thématiques.
* **`http://gluetun:8899/epg.xml`** : Guide électronique des programmes XMLTV filtré pour les chaînes actives.
* **`http://gluetun:8899/live/:slug.ts`** : Flux vidéo MPEG-TS temps réel de la chaîne demandée.
* **`http://gluetun:8899/status`** : État de santé JSON (nombre de chaînes configurées, catalogues chargés, flux actifs).

---

## 📺 Configuration dans Jellyfin

1. Dans Jellyfin, aller dans **Tableau de bord** $\rightarrow$ **TV en direct** (*Live TV*).
2. **Périphériques tuners** $\rightarrow$ Cliquer sur `+` $\rightarrow$ Choisir **Tuners M3U** :
   * **URL de la liste de lecture** : `http://gluetun:8899/playlist.m3u` (ou l'IP locale si vous ne passez pas par le nom du conteneur).
   * **Ignorer les horodatages DTS (Ignore DTS)** : ✅ **Cocher cette option impérativement** (permet à FFmpeg de générer des timestamps lisses et d'éviter les sauts de timecode).
3. **Fournisseurs de données TV Guide** $\rightarrow$ Cliquer sur `+` $\rightarrow$ Choisir **XMLTV** :
   * **Chemin ou URL du fichier** : `http://gluetun:8899/epg.xml`
4. Aller dans **Tâches planifiées** $\rightarrow$ Lancer la tâche **Actualiser le guide TV** (*Refresh Guide*).

---

## 📋 Bouquets inclus par défaut

* **TNT Française** (#1 à #25) : TF1, France 2, France 3, Canal+, France 5, M6, Arte, W9, TMC, TFX, Gulli, BFM, CNews, LCI, L'Équipe, etc.
* **Suisse & Belgique** (#26 à #28) : RTS 1, RTS 2, RTBF La Une (Formule 1, MotoGP et football européen en clair).
* **Foot & Sport** (#30 à #48) : Canal+ Foot, Canal+ Sport, Sport 360, Premier League, Ligue 1+, DAZN 1 & 2, beIN Sports 1/2/3, RMC Sport 1, Eurosport 1/2, beIN Sports Max 4 à 10.
* **Cinéma & Séries** (#50 à #67) : Canal+ Box Office, Canal+ Cinéma(s), Canal+ Grand Écran, Canal+ Séries, Canal+ Docs, Canal+ Kids, Ciné+ Premier/Frisson/Emotion/Famiz/Club/Classic, Polar+, Action, Paramount Channel, TCM Cinéma, Warner TV, TV Breizh.
* **Multiplex & Auto** (#70 à #76) : Canal+ Live 1 à 5, Multisports 4, Automoto La Chaîne.
* **Découverte & Sciences** (#80 à #93) : Discovery Channel, Discovery Science, Discovery Investigation, National Geographic, Nat Geo Wild, Planète+ Crime, Planète+ Aventure, Ushuaïa TV, Histoire TV, Toute l'Histoire, Science & Vie TV, Animaux, Trek, Seasons.
* **Séries & Câble** (#95 à #101) : 13ème Rue, Syfy, Comédie+, Paris Première, Téva, AB1.
* **Jeunesse** (#105 à #111) : Disney Channel, Disney Junior, Cartoon Network, Boomerang, Nickelodeon, TiJi, Télétoon+.
