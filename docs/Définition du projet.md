# 1 - Définition du projet

## 1.1 - Objectif du projet

### Quel problème résout l'application ?

De nombreuses petites et moyennes entreprises du bâtiment réalisent encore leurs devis et factures à l'aide de fichiers Excel ou de logiciels complexes, souvent coûteux et difficiles à utiliser. La gestion des matériaux, des fournisseurs et des tarifs est souvent dispersée, ce qui entraîne des erreurs, des pertes de temps et un manque de suivi.

L'objectif de cette application est de proposer un **logiciel SaaS simple et intuitif** permettant aux entreprises du bâtiment de centraliser la gestion de leurs clients, de leurs fournisseurs, de leurs matériaux et de leurs factures.

L'application doit permettre de :

- gérer les clients ;
- gérer les fournisseurs ;
- gérer un catalogue de matériaux ;
- enregistrer les tarifs des fournisseurs ;
- créer rapidement des factures ;
- ajouter des matériaux et de la main-d'œuvre aux factures ;
- conserver un historique des factures.

---

# 2 - Les utilisateurs

## 2.1 - Employé

L'employé est un utilisateur appartenant à une entreprise utilisant l'application.

Selon les droits qui lui sont attribués, il peut consulter ou modifier les données de l'entreprise.

### Fonctionnalités

- Se connecter à l'application
- Consulter les clients
- Ajouter et modifier des clients
- Consulter les fournisseurs
- Gérer les matériaux
- Gérer les tarifs des fournisseurs
- Créer des factures
- Modifier des factures
- Imprimer ou exporter les factures

---

## 2.2 - Administrateur de l'entreprise

L'administrateur de l'entreprise est responsable de la gestion de son espace de travail.

Il possède tous les droits sur les données de son entreprise.

### Fonctionnalités

- Gérer les employés
- Définir leurs droits d'accès
- Gérer les clients
- Gérer les fournisseurs
- Gérer les matériaux
- Gérer les catégories d'employés
- Gérer les tarifs horaires
- Créer, modifier et supprimer des factures
- Consulter l'historique des factures
- Configurer les informations de l'entreprise

---

## 2.3 - Administrateur de la plateforme

L'administrateur de la plateforme est responsable du bon fonctionnement du SaaS.

Il intervient uniquement sur les aspects techniques et administratifs de la plateforme.

### Fonctionnalités

- Gérer les entreprises
- Gérer les abonnements
- Gérer les utilisateurs
- Désactiver une entreprise
- Consulter les statistiques de la plateforme
- Gérer les paramètres globaux

---

# 3 - Rôles des utilisateurs

| Rôle | Description |
|------|-------------|
| **Employé** | Utilise l'application pour gérer les clients, les fournisseurs et les factures. |
| **Administrateur d'entreprise** | Administre l'ensemble des données et des utilisateurs de son entreprise. |
| **Administrateur plateforme** | Gère le SaaS et les entreprises clientes. |

---

# 4 - Parcours utilisateur

## 4.1 - Parcours d'un employé

1. Se connecte à l'application.
2. Consulte la liste des clients.
3. Sélectionne un client ou en crée un nouveau.
4. Crée une nouvelle facture.
5. Ajoute des matériaux.
6. Ajoute les heures de main-d'œuvre.
7. Vérifie les montants calculés.
8. Enregistre la facture.
9. Imprime ou exporte la facture au format PDF.

---

## 4.2 - Parcours de l'administrateur d'entreprise

1. Crée le compte de son entreprise.
2. Configure les informations de l'entreprise.
3. Ajoute les employés.
4. Configure les catégories d'employés et les tarifs horaires.
5. Ajoute les fournisseurs.
6. Renseigne les matériaux et leurs tarifs.
7. Gère les clients.
8. Suit les factures créées par l'entreprise.

---

## 4.3 - Parcours de l'administrateur de la plateforme

1. Accède au panneau d'administration.
2. Consulte la liste des entreprises.
3. Gère les abonnements.
4. Gère les comptes utilisateurs.
5. Consulte les statistiques globales.
6. Intervient en cas de problème technique ou administratif.