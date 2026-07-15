# 🌐 Configuration du domaine Infomaniak pour votre Media Server

> Ce guide vous accompagne dans la configuration de votre domaine chez **Infomaniak** pour l'utiliser avec **Traefik** (reverse proxy) et obtenir des certificats SSL wildcard automatiques via le DNS Challenge.

> [!IMPORTANT]
> Dans ce guide, remplacez systématiquement `votredomaine.fr` par votre vrai nom de domaine et `IP_VPS` par l'IP publique de votre VPS.

---

## 📋 Table des matières

1. [Achat et configuration du domaine](#1--achat-et-configuration-du-domaine)
2. [Configuration DNS](#2--configuration-dns)
3. [Génération du token API Infomaniak](#3--génération-du-token-api-infomaniak)
4. [Vérification de la propagation DNS](#4--vérification-de-la-propagation-dns)
5. [Sous-domaines utilisés par la stack](#5--sous-domaines-utilisés-par-la-stack)

---

## 1. 🛒 Achat et configuration du domaine

### Acheter le domaine

1. Rendez-vous sur [infomaniak.com](https://www.infomaniak.com/fr/domaines)
2. Recherchez la disponibilité de `votredomaine.fr`
3. Ajoutez-le au panier et finalisez l'achat
4. Une fois le paiement confirmé, le domaine apparaît dans votre **Manager Infomaniak**

### Accéder à la gestion du domaine

1. Connectez-vous sur [manager.infomaniak.com](https://manager.infomaniak.com)
2. Dans le menu latéral, cliquez sur **Domaines**
3. Sélectionnez `votredomaine.fr` dans la liste
4. Cliquez sur **Gestion DNS** (ou **Zone DNS**) pour accéder à l'éditeur d'enregistrements

> [!NOTE]
> Si votre domaine vient d'être acheté, la zone DNS peut mettre quelques minutes à être disponible. Patientez puis rafraîchissez la page.

---

## 2. 🔧 Configuration DNS

L'objectif est de faire pointer **tous les sous-domaines** (et le domaine racine) vers l'**IP publique de votre VPS**. C'est le VPS qui, via Traefik, redirigera le trafic vers les bons services.

### Architecture réseau

```
Utilisateur → votredomaine.fr → IP du VPS (IP_VPS)
                                     ↓
                                  Traefik (reverse proxy sur le VPS)
                                     ↓
                              Tunnel WireGuard → Serveur domestique
                                     ↓
                              Jellyfin / Radarr / Sonarr / ...
```

### Étape par étape

1. Dans la **Zone DNS** de votre domaine, supprimez les enregistrements par défaut s'il y en a (sauf les enregistrements `NS` — ne les touchez **jamais** ⚠️)

2. **Créez l'enregistrement A pour le domaine racine** (`@`) :

   | Champ       | Valeur             |
   |-------------|--------------------|
   | **Type**    | `A`                |
   | **Nom**     | `@`                |
   | **Cible**   | `IP_VPS`    |
   | **TTL**     | `3600` (1 heure)   |

3. **Créez l'enregistrement A wildcard** (`*`) pour couvrir tous les sous-domaines :

   | Champ       | Valeur             |
   |-------------|--------------------|
   | **Type**    | `A`                |
   | **Nom**     | `*`                |
   | **Cible**   | `IP_VPS`    |
   | **TTL**     | `3600` (1 heure)   |

4. **(Optionnel) Si votre VPS a une adresse IPv6**, ajoutez les enregistrements `AAAA` correspondants :

   | Champ       | Valeur                         |
   |-------------|--------------------------------|
   | **Type**    | `AAAA`                         |
   | **Nom**     | `@`                            |
   | **Cible**   | `votre:adresse:ipv6::complète` |
   | **TTL**     | `3600` (1 heure)               |

   Répétez pour le wildcard `*` avec le même format `AAAA`.

> [!TIP]
> Un TTL de `300` (5 minutes) est utile pendant la phase de mise en place pour propager rapidement les changements. Une fois tout fonctionnel, remontez-le à `3600` ou plus.

### Résultat attendu dans la zone DNS

Après configuration, votre zone DNS devrait ressembler à ceci :

```
@       3600    IN    A       IP_VPS
*       3600    IN    A       IP_VPS
```

> [!WARNING]
> L'enregistrement wildcard `*` ne couvre **pas** le domaine racine lui-même (`votredomaine.fr`). C'est pour cela qu'il faut **les deux** enregistrements : `@` **et** `*`.

---

## 3. 🔑 Génération du token API Infomaniak

Traefik a besoin d'un **token API Infomaniak** pour créer automatiquement les enregistrements DNS `TXT` nécessaires au **DNS Challenge** de Let's Encrypt. C'est ce mécanisme qui permet d'obtenir des **certificats SSL wildcard** (`*.votredomaine.fr`).

### Créer le token

1. Connectez-vous sur [manager.infomaniak.com](https://manager.infomaniak.com)
2. Cliquez sur votre **avatar/profil** en haut à droite
3. Sélectionnez **Paramètres du profil**
4. Dans le menu latéral, cliquez sur **Développeur** → **Tokens API**
5. Cliquez sur **➕ Créer un token**
6. Configurez le token :

   | Paramètre        | Valeur                                    |
   |------------------|-------------------------------------------|
   | **Nom**          | `traefik-dns-challenge`                   |
   | **Durée**        | Illimitée (ou définissez une expiration)  |
   | **Scope**        | `domain` — Gestion des noms de domaine   |

7. Cliquez sur **Créer**
8. 📋 **Copiez immédiatement le token** — il ne sera plus affiché ensuite !

> [!CAUTION]
> Le token API donne accès à la gestion DNS de votre domaine. **Ne le partagez jamais** et ne le commitez **jamais** dans un dépôt Git. Stockez-le uniquement dans votre fichier `.env`.

### Configurer le token dans votre stack

1. Ouvrez (ou créez) le fichier `.env` à la racine de votre projet Docker :

   ```bash
   nano .env
   ```

2. Ajoutez la variable suivante :

   ```env
   # Token API Infomaniak pour le DNS Challenge (Let's Encrypt via Traefik)
   INFOMANIAK_ACCESS_TOKEN=votre_token_api_ici
   ```

3. Sauvegardez le fichier (`Ctrl+O`, `Entrée`, `Ctrl+X` dans nano)

4. Vérifiez que le `.env` est bien dans votre `.gitignore` :

   ```bash
   grep ".env" .gitignore
   ```

   Si ce n'est pas le cas, ajoutez-le :

   ```bash
   echo ".env" >> .gitignore
   ```

### Vérifier le fonctionnement avec Traefik

Dans votre `docker-compose.yml`, Traefik doit être configuré pour utiliser le provider Infomaniak. La configuration essentielle ressemble à ceci :

```yaml
services:
  traefik:
    environment:
      - INFOMANIAK_ACCESS_TOKEN=${INFOMANIAK_ACCESS_TOKEN}
    command:
      - "--certificatesresolvers.letsencrypt.acme.dnschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.dnschallenge.provider=infomaniak"
      - "--certificatesresolvers.letsencrypt.acme.email=votre@email.fr"
```

> [!NOTE]
> Traefik supporte nativement le provider DNS Infomaniak depuis la version **2.6+**. Assurez-vous d'utiliser une version récente de Traefik.

---

## 4. 🔍 Vérification de la propagation DNS

Après avoir configuré vos enregistrements DNS, il faut vérifier que la propagation est effective. Cela peut prendre de **quelques minutes à 48 heures** (généralement moins de 30 minutes avec Infomaniak).

### Avec `dig`

```bash
# Vérifier le domaine racine
dig votredomaine.fr A +short
# Résultat attendu : IP_VPS

# Vérifier un sous-domaine (wildcard)
dig jellyfin.votredomaine.fr A +short
# Résultat attendu : IP_VPS

# Vérifier un autre sous-domaine
dig radarr.votredomaine.fr A +short
# Résultat attendu : IP_VPS

# Vérification détaillée avec les serveurs faisant autorité
dig votredomaine.fr A +trace
```

### Avec `nslookup`

```bash
# Vérification simple
nslookup votredomaine.fr
# Résultat attendu : Address: IP_VPS

# Vérifier un sous-domaine
nslookup jellyfin.votredomaine.fr
# Résultat attendu : Address: IP_VPS

# Interroger un serveur DNS spécifique (Google)
nslookup votredomaine.fr 8.8.8.8
```

### Avec `ping`

```bash
# Test rapide
ping -c 1 votredomaine.fr
# Devrait afficher : PING votredomaine.fr (IP_VPS)

ping -c 1 jellyfin.votredomaine.fr
# Devrait afficher : PING jellyfin.votredomaine.fr (IP_VPS)
```

### Vérification en ligne

Vous pouvez aussi utiliser des outils en ligne pour vérifier la propagation mondiale :

- 🌍 [dnschecker.org](https://dnschecker.org) — Vérifie la propagation depuis plusieurs pays
- 🔧 [mxtoolbox.com](https://mxtoolbox.com/DNSLookup.aspx) — Diagnostic DNS complet

> [!TIP]
> Si la propagation semble bloquée, essayez de vider votre cache DNS local :
> ```bash
> # Linux
> sudo systemd-resolve --flush-caches
>
> # Windows (PowerShell)
> ipconfig /flushdns
>
> # macOS
> sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
> ```

---

## 5. 📡 Sous-domaines utilisés par la stack

Voici la liste complète des sous-domaines utilisés par la stack media server. Grâce à l'enregistrement **wildcard** (`*`), ils sont **tous automatiquement résolus** vers l'IP du VPS — aucune configuration DNS individuelle n'est nécessaire.

| Sous-domaine | URL complète | Service | Description |
|---|---|---|---|
| `jellyfin` | `jellyfin.votredomaine.fr` | 🎬 Jellyfin | Serveur de streaming multimédia |
| `radarr` | `radarr.votredomaine.fr` | 🎥 Radarr | Gestionnaire de films |
| `sonarr` | `sonarr.votredomaine.fr` | 📺 Sonarr | Gestionnaire de séries TV |
| `prowlarr` | `prowlarr.votredomaine.fr` | 🔍 Prowlarr | Gestionnaire d'indexeurs |
| `bazarr` | `bazarr.votredomaine.fr` | 💬 Bazarr | Gestionnaire de sous-titres |
| `qbittorrent` | `qbittorrent.votredomaine.fr` | ⬇️ qBittorrent | Client torrent |
| `home` | `home.votredomaine.fr` | 🏠 Homepage | Tableau de bord / page d'accueil |
| `requests` | `requests.votredomaine.fr` | 🎫 Jellyseerr | Demandes de contenus |
| `invite` | `invite.votredomaine.fr` | ✉️ Wizarr | Gestion des invitations |
| `ygege` | `ygege.votredomaine.fr` | 📰 YGGtorrent | Accès à l'indexeur YGG |
| `ygege-vpn` | `ygege-vpn.votredomaine.fr` | 🔒 YGG via VPN | Accès YGG via tunnel VPN |
| `traefik` | `traefik.votredomaine.fr` | 🚦 Traefik | Dashboard du reverse proxy |
| `assistant` | `assistant.votredomaine.fr` | 🤖 Assistant IA | Assistant intelligent |
| `lazy` | `lazy.votredomaine.fr` | 😴 LazyLibrarian | Gestionnaire de livres/ebooks |
| `autobrr` | `autobrr.votredomaine.fr` | ⚡ Autobrr | Automatisation de téléchargements |

> [!NOTE]
> Tous ces sous-domaines sont gérés par **Traefik** via des labels Docker. Chaque service déclare son sous-domaine dans son `docker-compose.yml` avec des labels comme :
> ```yaml
> labels:
>   - "traefik.http.routers.jellyfin.rule=Host(`jellyfin.votredomaine.fr`)"
>   - "traefik.http.routers.jellyfin.tls.certresolver=letsencrypt"
> ```

### Ajouter un nouveau sous-domaine

Pour ajouter un nouveau service à la stack, il suffit de :

1. Ajouter le service dans votre `docker-compose.yml`
2. Ajouter les **labels Traefik** appropriés au service :

   ```yaml
   labels:
     - "traefik.enable=true"
     - "traefik.http.routers.monservice.rule=Host(`monservice.votredomaine.fr`)"
     - "traefik.http.routers.monservice.entrypoints=websecure"
     - "traefik.http.routers.monservice.tls.certresolver=letsencrypt"
   ```

3. Relancer la stack :

   ```bash
   docker compose up -d
   ```

4. ✅ C'est tout ! Grâce au wildcard DNS et au certificat SSL wildcard, le nouveau sous-domaine sera automatiquement accessible en HTTPS.

---

## 🎉 Récapitulatif

| Étape | Action | Statut |
|-------|--------|--------|
| 1 | Domaine acheté sur Infomaniak | ⬜ |
| 2 | Enregistrement A `@` → IP VPS | ⬜ |
| 3 | Enregistrement A `*` → IP VPS | ⬜ |
| 4 | Token API créé (scope `domain`) | ⬜ |
| 5 | Token copié dans `.env` | ⬜ |
| 6 | Propagation DNS vérifiée | ⬜ |
| 7 | Traefik configuré avec le provider Infomaniak | ⬜ |

> [!TIP]
> Une fois toutes les cases cochées, lancez votre stack Docker et vérifiez que Traefik obtient bien les certificats SSL en consultant ses logs :
> ```bash
> docker compose logs traefik | grep -i "certificate"
> ```
