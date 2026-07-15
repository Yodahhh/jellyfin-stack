# 🌐 Configuration de la Freebox — Serveur Média Domestique

> Guide de configuration du routeur Freebox pour l'infrastructure **srv-yodah**.
> Dernière mise à jour : juillet 2026

---

## 📋 Récapitulatif de l'infrastructure

| Élément              | Valeur                  |
| -------------------- | ----------------------- |
| Serveur local        | `srv-yodah`             |
| IP LAN du serveur    | `IP_SERVEUR_LOCAL`          |
| IP publique Freebox  | `IP_PUBLIQUE_BOX`          |
| IP du VPS            | `IP_VPS`         |
| Port WireGuard (VPN) | `UDP 51820`             |
| Tunnel VPN           | Freebox → VPS via WireGuard |

> [!IMPORTANT]
> La Freebox n'a besoin que d'**une seule redirection de port** : `UDP 51820` vers le serveur local. Tout le trafic web (HTTP/HTTPS) passe par le VPS, donc **aucun port 80 ou 443 n'est à ouvrir sur la box**.

---

## 1️⃣ Accès à l'interface d'administration Freebox

1. Ouvrez votre navigateur web sur un ordinateur **connecté au réseau local** de la Freebox.

2. Rendez-vous à l'adresse suivante :

   ```
   http://mafreebox.freebox.fr
   ```

   > [!TIP]
   > Si l'adresse ne fonctionne pas, essayez directement `http://192.168.1.254` (adresse IP par défaut de la Freebox).

3. Lors de la **première connexion**, la Freebox vous demande de définir un mot de passe administrateur :
   - Un message apparaît sur l'**écran LCD de la Freebox** (le boîtier Server).
   - Appuyez sur la **flèche droite (→)** sur la façade de la Freebox pour valider.
   - Choisissez un mot de passe fort et notez-le en lieu sûr.

4. Pour les connexions suivantes, saisissez simplement votre **mot de passe administrateur** et cliquez sur **« Connexion »**.

5. Vous arrivez sur le bureau Freebox OS. Vous y trouverez plusieurs icônes :
   - 🖥️ **Paramètres de la Freebox** — c'est ici que nous allons travailler.

---

## 2️⃣ IP fixe pour le serveur — Bail DHCP statique

> **Objectif** : S'assurer que `srv-yodah` obtient **toujours** l'adresse `IP_SERVEUR_LOCAL` sur le réseau local.

### Pourquoi c'est nécessaire

Sans bail statique, la Freebox pourrait attribuer une IP différente au serveur après un redémarrage, ce qui casserait la redirection de port.

### Étapes

1. Depuis le bureau Freebox OS, cliquez sur **« Paramètres de la Freebox »** (icône engrenage ⚙️).

2. Dans le menu de gauche, naviguez vers :
   ```
   Mode avancé → DHCP
   ```
   > [!NOTE]
   > Si vous ne voyez pas « Mode avancé », cliquez sur le bouton **« Mode avancé »** en bas à gauche de la fenêtre des paramètres pour l'activer.

3. Cliquez sur l'onglet **« Baux statiques »** (en haut de la page DHCP).

4. Cliquez sur le bouton **« Ajouter un bail DHCP statique »** (bouton ➕ en bas de la liste).

5. Remplissez les champs suivants :

   | Champ         | Valeur                                |
   | ------------- | ------------------------------------- |
   | **IP**        | `IP_SERVEUR_LOCAL`                        |
   | **Adresse MAC** | *(adresse MAC de la carte réseau de srv-yodah)* |
   | **Commentaire** | `srv-yodah — serveur média`          |

   > [!TIP]
   > Pour trouver l'adresse MAC de votre serveur, exécutez cette commande sur `srv-yodah` :
   > ```bash
   > ip link show | grep -A1 "state UP"
   > ```
   > L'adresse MAC ressemble à : `aa:bb:cc:dd:ee:ff`
   >
   > Alternativement, allez dans l'onglet **« Baux dynamiques »** : si le serveur est déjà connecté, son adresse MAC y apparaît.

6. Cliquez sur **« Sauvegarder »** ✅.

7. **Redémarrez le serveur** (ou renouvelez le bail DHCP) pour que le nouveau bail prenne effet :

   ```bash
   # Sur srv-yodah :
   sudo dhclient -r && sudo dhclient
   ```

8. Vérifiez que le serveur a bien obtenu la bonne IP :

   ```bash
   ip addr show | grep "IP_SERVEUR_LOCAL"
   ```

   Vous devriez voir une ligne contenant `inet IP_SERVEUR_LOCAL/24`.

---

## 3️⃣ Redirection de port — WireGuard (UDP 51820)

> **Objectif** : Permettre au VPS (`IP_VPS`) d'établir le tunnel WireGuard vers le serveur local en redirigeant le port `UDP 51820` de la Freebox vers `IP_SERVEUR_LOCAL`.

### Étapes

1. Depuis le bureau Freebox OS, cliquez sur **« Paramètres de la Freebox »** (icône engrenage ⚙️).

2. Dans le menu de gauche, naviguez vers :
   ```
   Mode avancé → Gestion des ports
   ```

3. Cliquez sur le bouton **« Ajouter une redirection »** (bouton ➕).

4. Remplissez les champs comme suit :

   | Champ                  | Valeur              |
   | ---------------------- | ------------------- |
   | **IP de destination**  | `IP_SERVEUR_LOCAL`      |
   | **IP source**          | *Toutes*            |
   | **Protocole**          | `UDP`               |
   | **Port de début (source)** | `51820`         |
   | **Port de fin (source)**   | `51820`         |
   | **Port de début (destination)** | `51820`    |
   | **Port de fin (destination)**   | `51820`    |
   | **Commentaire**        | `WireGuard VPN`     |

   > [!WARNING]
   > Assurez-vous de bien sélectionner **UDP** et non TCP. WireGuard utilise exclusivement le protocole UDP.

5. Cliquez sur **« Sauvegarder »** ✅.

6. La redirection apparaît maintenant dans la liste avec une **coche verte** ✅ indiquant qu'elle est active.

---

## 4️⃣ Vérification — Tester que tout fonctionne

### 4.1 — Vérifier le bail DHCP statique

Depuis `srv-yodah`, confirmez l'adresse IP :

```bash
hostname -I
```

Résultat attendu (l'IP `IP_SERVEUR_LOCAL` doit apparaître) :

```
IP_SERVEUR_LOCAL
```

### 4.2 — Vérifier que le port est ouvert depuis l'extérieur

**Depuis le VPS** (`IP_VPS`), testez la connectivité vers le port WireGuard :

```bash
# Test avec nmap (UDP)
sudo nmap -sU -p 51820 IP_PUBLIQUE_BOX
```

Résultat attendu :

```
PORT      STATE         SERVICE
51820/udp open|filtered unknown
```

> [!NOTE]
> L'état `open|filtered` est normal pour un scan UDP — cela signifie que le port n'est pas bloqué. WireGuard ne répond pas aux paquets non authentifiés, donc `nmap` ne peut pas confirmer un état `open` franc.

### 4.3 — Vérifier le tunnel WireGuard

**Sur `srv-yodah`**, vérifiez l'état de l'interface WireGuard :

```bash
sudo wg show
```

Résultat attendu — vous devriez voir le peer VPS avec un **handshake récent** :

```
interface: wg0
  public key: <clé_publique_serveur>
  private key: (hidden)
  listening port: 51820

peer: <clé_publique_vps>
  endpoint: IP_VPS:51820
  allowed ips: 10.0.0.0/24
  latest handshake: X seconds/minutes ago    ← ✅ Doit être récent
  transfer: X.XX MiB received, X.XX MiB sent
```

> [!WARNING]
> Si `latest handshake` affiche **aucune valeur** ou un temps très ancien, la redirection de port ne fonctionne probablement pas correctement. Revenez à l'étape 3 et vérifiez votre configuration.

### 4.4 — Test de connectivité à travers le tunnel

**Depuis le VPS**, pingez le serveur via le tunnel VPN :

```bash
ping -c 4 10.0.0.2    # Adresse VPN de srv-yodah (ajustez selon votre config)
```

Résultat attendu :

```
64 bytes from 10.0.0.2: icmp_seq=1 ttl=64 time=12.3 ms
64 bytes from 10.0.0.2: icmp_seq=2 ttl=64 time=11.8 ms
...
```

---

## 5️⃣ Notes importantes

### 🔒 Pas besoin du mode bridge

Le **mode bridge** de la Freebox (qui désactive le routeur intégré) **n'est pas nécessaire** pour cette infrastructure. Le mode routeur standard fonctionne parfaitement :

- ✅ La Freebox gère le NAT et le DHCP normalement.
- ✅ Une simple redirection de port suffit pour le tunnel WireGuard.
- ✅ Le mode bridge compliquerait inutilement la configuration (perte du Wi-Fi Freebox, nécessité d'un routeur externe, etc.).

### 🌍 Pas de ports 80/443 à ouvrir sur la Freebox

Contrairement à une configuration classique de serveur web, **vous n'avez pas besoin d'ouvrir les ports HTTP (80) et HTTPS (443)** sur la Freebox. Voici pourquoi :

```
┌─────────────────────────────────────────────────────────────────┐
│                    Flux du trafic web                           │
│                                                                 │
│  Utilisateur ──► VPS (IP_VPS:443) ──► Tunnel WireGuard  │
│                  ▲ Caddy/Reverse Proxy        │                 │
│                  │ Ports 80/443 ouverts       ▼                 │
│                  │                     srv-yodah (IP_SERVEUR_LOCAL) │
│                  │                     Jellyfin, services...    │
│                  └──────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

- Le **VPS** est le seul point d'entrée public pour le trafic web.
- Le trafic arrive sur le VPS, puis est routé vers `srv-yodah` via le **tunnel WireGuard**.
- La Freebox n'a donc besoin que du port **UDP 51820** pour maintenir ce tunnel.

### 🔄 En cas de changement d'IP publique

La Freebox de Free attribue généralement une **IP fixe**, mais en cas de changement :

1. Mettez à jour la configuration WireGuard côté VPS avec la nouvelle IP publique :

   ```bash
   # Sur le VPS, éditez la config WireGuard
   sudo nano /etc/wireguard/wg0.conf
   # Modifiez la ligne Endpoint du peer srv-yodah
   ```

2. Redémarrez l'interface WireGuard sur le VPS :

   ```bash
   sudo systemctl restart wg-quick@wg0
   ```

> [!TIP]
> Pour automatiser la détection de changement d'IP, vous pouvez configurer un **DNS dynamique** (comme `duckdns.org`) et utiliser le nom de domaine comme endpoint WireGuard au lieu de l'IP.

### 🛡️ Sécurité

- La Freebox intègre un **pare-feu basique** activé par défaut — laissez-le activé.
- N'ouvrez **que les ports strictement nécessaires** (ici, uniquement UDP 51820).
- Pensez à vérifier régulièrement la liste des redirections de ports dans la Freebox pour supprimer toute règle obsolète.

---

## 📚 Ressources utiles

- [Documentation Freebox OS](https://dev.freebox.fr/sdk/os/) — API et documentation officielle
- [WireGuard — Site officiel](https://www.wireguard.com/) — Documentation du protocole VPN
- [Tutoriel Free : Redirection de ports](https://www.free.fr/assistance/) — Assistance Free

---

> **Résumé** : Sur la Freebox, il suffit de (1) fixer l'IP du serveur en `IP_SERVEUR_LOCAL` via un bail DHCP statique, et (2) rediriger le port `UDP 51820` vers cette IP. C'est tout ! 🎉
