---

# 🏢 Entreprise

Représente une entreprise cliente utilisant l'application.

Toutes les données (clients, fournisseurs, factures, matériaux, etc.) appartiennent à une entreprise.

## Champs

- id
- nom
- adresse
- email
- téléphone
- numéro TVA *(optionnel)*
- logo *(optionnel)*
- date de création
- statut *(actif | suspendu)*

## Relations

- possède plusieurs utilisateurs
- possède plusieurs clients
- possède plusieurs fournisseurs
- possède plusieurs matériaux
- possède plusieurs tarifs de matériaux
- possède plusieurs catégories d'employés
- possède plusieurs factures

---

# 👤 Utilisateur

Représente une personne utilisant l'application.

Un utilisateur appartient à une seule entreprise.

## Champs

- id
- entreprise
- prénom
- nom
- email
- mot de passe (hashé)
- rôle *(employé | administrateur)*
- téléphone *(optionnel)*
- date de création
- dernière connexion

## Relations

- appartient à une entreprise

---

# 🏢 Fournisseur

Représente une entreprise fournissant des matériaux.

Chaque fournisseur appartient à une entreprise.

## Champs

- id
- entreprise
- code fournisseur
- société
- adresse
- catégorie

## Relations

- appartient à une entreprise
- possède plusieurs tarifs de matériaux

---

# 📦 Matériel

Représente un produit ou un matériau pouvant être utilisé dans une facture.

Chaque matériel appartient à une entreprise.

## Champs

- id
- entreprise
- référence matériel
- libellé
- unité *(pièce, kg, m, etc.)*

## Relations

- appartient à une entreprise
- possède plusieurs tarifs fournisseurs

---

# 💰 Tarif matériel

Associe un fournisseur à un matériel avec son tarif.

## Champs

- id
- entreprise
- fournisseur
- matériel
- tarif
- tarif par défaut *(booléen)*
- rabais
- délai de livraison

## Relations

- appartient à une entreprise
- appartient à un fournisseur
- appartient à un matériel
- peut être utilisé dans plusieurs lignes de facture

---

# 👤 Client

Représente un client de l'entreprise.

## Champs

- id
- entreprise
- code client
- nom
- prénom
- société
- email
- téléphone

## Relations

- appartient à une entreprise
- possède plusieurs factures

---

# 🧾 Facture

Représente une facture émise pour un client.

## Champs

- id
- entreprise
- client
- numéro de facture
- date
- montant HT
- montant TTC
- rabais
- statut

## Relations

- appartient à une entreprise
- appartient à un client
- possède plusieurs lignes de facture

---

# 📄 Ligne de facture

Représente une ligne d'une facture. Une ligne peut correspondre à un matériel ou à une prestation de main-d'œuvre.

## Champs

- id
- facture
- tarif matériel *(optionnel)*
- catégorie d'employé *(optionnel)*
- position
- référence matériel
- libellé matériel
- quantité matériel
- tarif matériel
- libellé employé
- temps employé
- tarif employé

## Relations

- appartient à une facture
- peut référencer un tarif matériel
- peut référencer une catégorie d'employé

---

# 👷 Catégorie d'employé

Définit les différents types d'employés et leur tarif horaire.

## Champs

- id
- entreprise
- code
- libellé
- tarif horaire

## Relations

- appartient à une entreprise
- peut être utilisée dans plusieurs lignes de facture