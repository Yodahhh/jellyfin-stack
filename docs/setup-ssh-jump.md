# Guide : Connexion SSH Sécurisée via Rebond (Jump Host)

Ce guide explique comment prendre la main sur votre Serveur Maison à distance, de manière totalement sécurisée.

Plutôt que d'ouvrir le port SSH (22) de votre Freebox et de l'exposer à tout Internet (ce qui est dangereux), nous allons utiliser le tunnel WireGuard que nous avons créé. 

**Principe :** Vous vous connectez en SSH au VPS, puis depuis le VPS, vous "rebondissez" vers le Serveur Maison via le tunnel VPN.

Il existe deux méthodes : la méthode manuelle (en deux étapes), et la méthode automatique transparente (la plus recommandée).

---

## Méthode 1 : Automatique et Transparente (Recommandée)

Vous pouvez configurer votre PC (Windows/Mac/Linux) pour qu'il gère le rebond tout seul de manière invisible. Quand vous taperez `ssh maison`, le PC passera automatiquement par le VPS.

Sur votre ordinateur personnel, éditez ou créez le fichier de configuration SSH (sous Windows : `C:\Users\VotreNom\.ssh\config`, sous Linux/Mac : `~/.ssh/config`) :

```ssh
# 1. Connexion au VPS
Host vps
    HostName IP_VPS
    User debian                  # À adapter selon l'OS du VPS (root, ubuntu, debian...)
    IdentityFile ~/.ssh/id_rsa   # Le chemin vers votre clé SSH privée pour le VPS

# 2. Connexion au Serveur Maison (via le rebond)
Host maison
    HostName 10.100.0.4          # L'IP WireGuard de votre Serveur Maison
    User yodah                   # Votre utilisateur sur le serveur maison
    ProxyJump vps                # C'est la commande magique qui dit de passer par le VPS !
    IdentityFile ~/.ssh/id_rsa   # Le chemin vers votre clé SSH privée pour le serveur maison
```

**Pour vous connecter :**
Ouvrez simplement un terminal et tapez :
```bash
ssh maison
```
Le terminal va se connecter au VPS en arrière-plan et vous amener directement sur votre serveur maison. Magique !

---

## Méthode 2 : Rebond manuel (En 2 étapes)

Si vous n'êtes pas sur votre PC personnel et que vous n'avez pas accès à votre fichier `config` :

**Étape 1 :** Connectez-vous d'abord à votre VPS :
```bash
ssh root@IP_VPS
```

**Étape 2 :** Une fois dans la console du VPS, connectez-vous au serveur maison via son adresse IP du tunnel WireGuard (`10.100.0.4`) :
```bash
ssh yodah@10.100.0.4
```
*(Attention, pour que cette étape fonctionne, il faut que la clé SSH de votre serveur maison soit présente sur le VPS, ou utiliser l'option de transfert d'agent SSH `-A`).*

---

> [!TIP]
> **Pourquoi cette méthode est la meilleure ?**
> - Le port SSH (22) de votre Freebox reste **complètement fermé**.
> - Votre serveur maison n'est accessible que si on passe par le VPS.
> - Le trafic entre le VPS et chez vous est chiffré dans le tunnel WireGuard.
> - Même si quelqu'un trouve l'IP de votre box, il ne verra rien.
