# Guide : Préparation du Disque Dur Externe (8 To) sous Debian

Ce guide vous explique comment formater et monter correctement votre disque dur externe USB de 8 To sur votre futur serveur Debian, afin de stocker vos médias de manière fiable pour Docker.

Il est **crucial** de monter ce disque via son identifiant unique (UUID) et avec des sécurités, pour éviter que vos téléchargements ne remplissent votre petit disque NVMe interne si le câble USB se débranche.

## Étape 1 : Repérer le disque

Branchez votre boîtier externe et tapez la commande suivante pour lister les disques connectés :
```bash
lsblk
```
Vous devriez voir votre disque NVMe interne (souvent appelé `nvme0n1`) et votre disque externe de 8 To (souvent appelé `sda` ou `sdb`).
Identifiez bien le nom de votre disque de 8 To (nous utiliserons `sda` pour cet exemple).

## Étape 2 : Formater le disque en ext4 (Optionnel mais recommandé)

> [!WARNING]
> **ATTENTION :** Cette étape va effacer **TOUTES** les données présentes sur le disque de 8 To. Si vous avez déjà des fichiers dessus, sautez cette étape.

Si votre disque est neuf ou en format Windows (NTFS), il est très fortement conseillé de le formater au format natif Linux (`ext4`) pour de meilleures performances et la gestion parfaite des *Hardlinks* (essentiel pour Sonarr/Radarr) :

```bash
# 1. Créer une nouvelle table de partition GPT
sudo parted /dev/sda mklabel gpt

# 2. Créer une partition qui prend tout l'espace
sudo parted -a opt /dev/sda mkpart primary ext4 0% 100%

# 3. Formater la partition fraîchement créée en ext4
sudo mkfs.ext4 -L MEDIA /dev/sda1
```

## Étape 3 : Récupérer l'UUID du disque

C'est l'étape la plus importante. Ne montez jamais un disque USB avec `/dev/sda1` car si vous branchez une clé USB avant de démarrer, le nom peut changer. On utilise l'UUID.

```bash
sudo blkid
```
Repérez la ligne correspondant à votre partition (ex: `/dev/sda1`) et copiez la valeur `UUID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"`. Ne copiez pas les guillemets.

## Étape 4 : Créer le point de montage

Créons le dossier où le disque sera accessible (celui utilisé par notre script `install.sh`) :
```bash
sudo mkdir -p /mnt/media
```

## Étape 5 : Configurer le montage automatique (fstab)

Éditez le fichier des points de montage du système :
```bash
sudo nano /etc/fstab
```

Ajoutez cette ligne tout en bas du fichier (remplacez `VOTRE_UUID` par l'UUID récupéré à l'étape 3) :
```text
UUID=VOTRE_UUID /mnt/media ext4 defaults,nofail 0 2
```
*L'option `nofail` est vitale : si votre disque dur USB lâche ou se débranche, le serveur démarrera quand même.*

## Étape 6 : Tester le montage

Testez que tout fonctionne sans avoir à redémarrer :
```bash
sudo mount -a
```

Si la commande ne retourne aucune erreur, c'est que c'est bon ! Vous pouvez vérifier que le disque est bien monté avec :
```bash
df -h
```
Vous devriez voir que `/mnt/media` dispose d'environ 7.3 To d'espace libre (8 To commerciaux).

## Étape 7 : Ajuster les permissions

Pour que Docker et vos conteneurs puissent lire et écrire sur le disque, on donne les permissions à l'utilisateur principal (UID 1000) :
```bash
sudo chown -R 1000:1000 /mnt/media
```

---
**✅ C'est terminé !** 
Votre disque est prêt, sécurisé, et survivra aux redémarrages. Vous pouvez maintenant lancer le script `./install.sh` de la stack Jellyfin.
