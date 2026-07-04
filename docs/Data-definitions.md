# Modèle de données

Ce document décrit les principales entités de l'application et leurs relations. Il sert de base pour la conception de la base de données.

---

# 👤 Utilisateur

Représente toutes les personnes utilisant la plateforme (visiteurs, propriétaires, administrateurs).

## Champs

- id
- prénom
- nom
- email
- mot de passe (hashé)
- rôle *(visiteur | propriétaire | admin)*
- téléphone *(optionnel)*
- photo de profil *(optionnel)*
- email vérifié *(booléen)*
- date de création
- dernière connexion

## Relations

- peut créer plusieurs demandes
- peut ajouter plusieurs favoris
- peut écrire plusieurs avis
- peut être propriétaire de plusieurs salles

---

# 🏠 Salle

Représente un lieu de réception (domaine, salle, hôtel, etc.).

## Champs

- id
- titre / nom
- description
- capacité maximale
- prix indicatif
- adresse complète
- canton
- ville *(optionnel)*
- latitude
- longitude
- statut *(brouillon | en attente | publié | rejeté)*
- date de création
- dernière mise à jour

## Relations

- appartient à un ou plusieurs propriétaires
- possède plusieurs photos
- possède plusieurs équipements
- possède plusieurs avis
- reçoit plusieurs demandes
- peut être ajoutée en favori par plusieurs utilisateurs

---

# 📸 Photo

Représente les images d’une salle.

## Champs

- id
- url
- ordre d’affichage
- date d’ajout

## Relations

- appartient à une salle

---

# ⭐ Avis

Représente les évaluations laissées par les visiteurs.

## Champs

- id
- note *(1 à 5)*
- commentaire
- date de création
- modéré *(booléen)*

## Relations

- appartient à une salle
- écrit par un utilisateur

---

# 📩 Demande

Représente une demande de contact ou de devis envoyée par un visiteur.

## Champs

- id
- message
- type *(contact | devis)*
- statut *(envoyée | lue | répondue | archivée)*
- date d’envoi
- date de réponse *(optionnel)*

## Relations

- appartient à une salle
- envoyée par un utilisateur (visiteur)
- traitée par un propriétaire

---

# ❤️ Favori

Représente une salle sauvegardée par un utilisateur.

## Champs

- id
- date d’ajout

## Relations

- appartient à un utilisateur
- appartient à une salle

---

# 🧰 Équipement

Représente les équipements disponibles dans une salle.

## Champs

- id
- nom
- description *(optionnel)*
- icône *(optionnel)*

## Relations

- peut être associé à plusieurs salles

---

# 📊 PropriétaireSalle (relation)

Table intermédiaire pour gérer les propriétaires de salles (relation potentiellement multiple).

## Champs

- id
- rôle du propriétaire *(principal / secondaire)*
- date d’ajout

## Relations

- utilisateur (propriétaire)
- salle

---

# 🧠 Résumé des relations principales

- Un utilisateur peut avoir plusieurs rôles selon le contexte
- Une salle appartient à un ou plusieurs propriétaires
- Une salle contient des photos, équipements et avis
- Un utilisateur peut créer des demandes, avis et favoris
- Les demandes sont liées à une salle + un utilisateur