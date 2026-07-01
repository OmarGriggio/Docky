# 0 - Conception

# 1 - Cahier des charges

# 2 - Architecture

## 2.1 - Architecture général & décision 

| Décision          | Choix                    | Justification                                                                     |
| ----------------- | ------------------------ | --------------------------------------------------------------------------------- |
| Frontend          | Angular                  | Familiarité avec le framework et architecture adaptée aux applications métier     |
| Backend           | Node.js + Express        | API REST légère et largement utilisée                                             |
| Base de données   | PostgreSQL               | Robuste, relationnelle, adaptée aux données métier                                |
| Accès aux données | SQL natif via Repository | Maîtrise de SQL, contrôle total sur les requêtes, simplicité de la pile technique |
| Authentification  | JWT                      | Standard pour une API REST                                                        |
| Déploiement       | Docker Compose           | Reproductibilité de l'environnement                                               |

## 2.2 - Architecture backend

controllers/
services/
repositories/
middlewares/
validators/
config/

## 2.3 - Architecture frontend

core/
shared/
features/
layout/

## 2.4 - Database

Base de données
Tables
Relations
Contraintes

## 2.5 - Authentificaiton 

JWT
Middleware
Roles
Permissions

# 3 - Fonctionnalités métier
## Fonctionnalités
Créer un utilisateur

Préconditions

Étapes

Résultat attendu

Erreurs possibles

## Tâches
Créer le projet Angular

Configurer le routing

Créer le layout

Créer le composant Login

Créer le composant Dashboard

Créer AuthService

Créer EquipmentService

Créer UserService

Créer les interfaces

Créer les routes Express

Créer le contrôleur User

Créer le Service User

Créer le Repository User

Configurer Prisma

Créer la migration

# 4 - Développement


# 5 - Docker
Frontend

Backend

Database

# 6 - Production
- Déploiement