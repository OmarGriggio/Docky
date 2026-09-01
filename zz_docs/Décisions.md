# Journal des décisions

Ce fichier trace les choix techniques qui avaient plusieurs options raisonnables, avec le pourquoi — pas juste "ce qui a été fait" (déjà dans `CLAUDE.md` et l'historique git), mais **ce qui a été écarté et pourquoi**. Utile pour ne pas revenir dessus sans relire cette page, et pour se souvenir du raisonnement plus tard.

## Archiver plutôt que supprimer (`actif`)

**Choix** : `actif BOOLEAN DEFAULT TRUE` sur clients/fournisseurs/chantiers/documents/ressources, `PATCH /:id/archive` et `/:id/unarchive` remplacent `DELETE`.

- **Pour** : un logiciel de facturation ne devrait jamais vraiment perdre une donnée métier (traçabilité comptable) ; réutilise un pattern déjà à moitié présent (`utilisateurs`, `ressources` avaient déjà la colonne, jamais branchée) ; réversible (un archivage par erreur se répare en un clic).
- **Contre / limites** : une table de plus à filtrer partout (`WHERE actif = true` par défaut) — oubli facile sur une future requête ; ne règle pas la question du RGPD/droit à l'oubli si un jour un client demande une vraie suppression (pas traité, pas urgent vu qu'il n'y a pas encore de vraies données clients).
- **Écarté** : garder `DELETE` en plus d'archiver (les deux). Rejeté pour rester simple — une seule action par ligne, pas deux à maintenir des deux côtés (API + UI).

## Identifiant des routes archive/unarchive : `:id` partout

**Choix** : `PATCH /client/:id/archive` (id numérique dans l'URL), alors que l'ancien `DELETE /client` prenait `num_client` dans le body.

- **Pour** : cohérent avec `chantier`/`document` qui utilisaient déjà `:id` ; plus RESTful (l'URL identifie la ressource) ; un seul type d'identifiant à documenter/apprendre.
- **Contre** : petit changement de contrat d'API — le frontend a dû être adapté en même temps (pas juste un ajout, une modif).

## Rate limiting : 20 tentatives / 15 min, en mémoire

**Choix** : `express-rate-limit`, `limit: 20`, `windowMs: 15 * 60 * 1000`, compteur en mémoire du process (pas Redis).

- **Pour** : zéro infra supplémentaire, une dépendance, cinq lignes de config ; largement suffisant pour un process backend unique (pas de scaling horizontal prévu) ; 20 plutôt que la valeur par défaut habituelle (souvent 5-10) car un utilisateur qui se trompe deux fois de mot de passe ne doit pas se retrouver bloqué.
- **Contre / limites** : si un jour plusieurs instances du backend tournent derrière un load balancer, chaque instance a son propre compteur — la vraie limite globale devient `20 × nombre d'instances`. Pas un problème tant qu'il y a un seul conteneur backend.

**Décision liée — `app.set("trust proxy", 1)`** : ajouté même si Omar ne met en place ni load balancer ni Cloudflare lui-même, parce que la quasi-totalité des hébergeurs (Render, Railway, Fly.io...) route déjà le trafic à travers leur propre proxy même sur un plan "sans infra" — sans ce réglage, `req.ip` serait toujours l'IP du proxy de l'hébergeur, et le rate limiting deviendrait silencieusement inutile (tout le monde partage un seul compteur) une fois déployé. Coût : une ligne, zéro complexité ajoutée côté Omar.

## Dockerfile : un seul fichier multi-stage (`dev`/`build`/`prod`)

**Choix** : un `Dockerfile` avec plusieurs stages (`FROM ... AS dev`, `AS build`, `AS prod`), sélectionnés via `target:` dans `docker-compose.yml`.

- **Pour** : une seule source de vérité pour les étapes communes (dépendances, `WORKDIR`) ; le flow de dev existant (`docker compose up --build`) n'a pas changé, juste épinglé sur `target: dev` ; l'image de prod (`node:22-slim`, code compilé, sans devDependencies, utilisateur non-root) reste séparée et plus légère (269 Mo vs 315 Mo testé).
- **Contre** : un seul fichier un peu plus long à lire, la syntaxe multi-stage est un peu moins évidente pour quelqu'un qui découvre Docker que deux fichiers séparés (`Dockerfile.dev` / `Dockerfile`).
- **Écarté** : deux fichiers séparés. Plus simple à lire isolément, mais duplique les étapes communes (installer les deps, `WORKDIR`) et il est plus facile d'oublier de répercuter un changement dans les deux.

## URLs API : `environment.ts` (Angular natif) plutôt qu'une config runtime

**Choix** : `src/environments/environment.ts`/`environment.prod.ts`, remplacés au moment du build via `fileReplacements` dans `angular.json`.

- **Pour** : mécanisme standard Angular, zéro dépendance, le remplacement est vérifié au build (pas d'oubli silencieux) ; les deux fichiers ne contiennent aucun secret (juste une URL publique), donc peuvent être commités sans souci, contrairement à un `.env`.
- **Contre / limites** : l'URL de prod est figée **au moment du build**, pas modifiable après coup sans rebuilder — si l'URL de l'API change, il faut relancer un build de prod du frontend. Pas un souci pour l'instant (un seul environnement de prod prévu), mais à garder en tête si un jour il faut la même image pour plusieurs environnements (staging/prod) sans rebuild à chaque fois — solution alternative dans ce cas : un fichier de config chargé au runtime (`config.json` servi à côté du bundle), plus complexe, pas nécessaire maintenant.

## Bundle initial trop gros : lazy loading des routes, pas augmentation du budget

**Choix** : toutes les routes d'`app.routes.ts` en `loadComponent`, budget `angular.json` inchangé (500 Ko warning / 1 Mo erreur).

- **Pour** : corrige la vraie cause (tout le code de l'app était chargé d'un coup, y compris `/admin`, `/uitest`, peu importe la première page visitée) plutôt que de masquer le symptôme ; résultat mesuré : 1.21 Mo → 485 Ko initial, le reste en chunks à la demande.
- **Contre** : aucun réel, sauf une micro-latence additionnelle (un aller-retour réseau de plus) la première fois qu'on visite une route donnée — largement compensé par le chargement initial plus rapide.
- **Écarté** : juste monter le budget dans `angular.json`. Aurait fait disparaître l'avertissement sans rien résoudre — le budget signalait un vrai problème (aucun découpage de code), pas un seuil mal calibré.

## Gestion d'erreurs : hiérarchie `AppError` + un seul middleware

**Choix** : `NotFoundError`/`ConflictError`/`UnauthorizedError`/`ForbiddenError` (toutes `extends AppError` avec un `statusCode`), un middleware d'erreur unique en fin d'`app.ts`, aucun `try/catch` dans les contrôleurs (Express 5 forward les rejets de promesses automatiquement).

- **Pour** : chaque service choisit le bon code HTTP en une ligne (`throw new NotFoundError(...)`) sans jamais toucher à `res` ; un seul endroit à modifier pour changer le format de réponse d'erreur ; profite d'Express 5 plutôt que de réinventer un wrapper `asyncHandler`.
- **Contre** : dépend d'Express 5 (Express 4 n'aurait pas forward les erreurs async automatiquement — aurait nécessité un wrapper ou `try/catch` partout). Pas un souci ici, le projet est déjà sur Express 5.

## Rôles : `id_entreprise` reste `NOT NULL`, admin plateforme créé à la main

**Choix retenu par Omar** : pas de colonne nullable, pas de table séparée. `id_entreprise` reste obligatoire pour tout le monde, y compris un `ADMIN_PLATEFORME` (qui se voit simplement attribuer une entreprise réelle, sans rapport avec ses permissions qui viennent uniquement de `role`). Aucune API ne permet de créer un compte `ADMIN_PLATEFORME` — inséré à la main en base.

- **Pour** : zéro changement de type ailleurs dans le code (`id_entreprise: number` reste vrai partout, aucun contrôleur/service n'a besoin de gérer un cas `null`) ; la contrainte `NOT NULL` elle-même empêche techniquement qu'un admin plateforme soit créé autrement qu'à la main (même en cas de bug applicatif, la base refuserait un `id_entreprise` manquant) ; suffisant tant qu'il n'y a pas de vrai besoin de "staff plateforme" au pluriel.
- **Contre / limites** : si un jour il faut une vraie page de gestion des admins plateforme (plusieurs comptes, onboarding en self-service), il faudra soit leur assigner arbitrairement une entreprise existante (bizarre conceptuellement — pourquoi un admin plateforme "appartiendrait" à une entreprise cliente ?), soit revenir sur cette décision. Assumé comme acceptable pour l'instant, à revoir si ce besoin apparaît.
- **Portée actuelle, à ne pas supposer plus large qu'elle ne l'est** : tel qu'implémenté, un `ADMIN_PLATEFORME` a les pouvoirs plateforme (lister/éditer n'importe quelle entreprise) **et** agit comme un `ADMIN` normal sur *sa propre* entreprise (celle que pointe son `id_entreprise`) — mais ne voit pas les clients/chantiers/factures **des autres** entreprises. Omar veut, à terme, qu'un admin plateforme puisse tout voir/gérer sur n'importe quelle entreprise (pas juste la sienne) — pas implémenté, mis de côté volontairement (2026-09-01) le temps qu'il y ait de vraies fonctionnalités admin-plateforme à construire. Pour cette version-là (accès complet, toutes entreprises confondues), deux pistes discutées, aucune tranchée :
  - rendre `id_entreprise` nullable pour de vrai (retour sur ce choix), et ajouter aux endpoints métier (clients/chantiers/documents/ressources) un moyen explicite de cibler une entreprise précise (ex. `?entreprise=X`) quand l'appelant est `ADMIN_PLATEFORME` — pas juste débloquer un accès, une vraie fonctionnalité de navigation cross-entreprise à concevoir ;
  - ou une notion d'"impersonation" (l'admin plateforme choisit une entreprise à incarner temporairement).
- **Options écartées** (pour le choix "NOT NULL" ci-dessus) :
  - *`id_entreprise` nullable* — plus "correct" conceptuellement (un admin plateforme n'appartient à aucune entreprise), mais aurait obligé à faire remonter `number | null` dans le typage partout où `req.user.id_entreprise` est utilisé (7 contrôleurs), avec un helper de garde (`getEntrepriseId(req)`) à ajouter partout. Écarté à la demande d'Omar : plus de surface de code à maintenir pour un besoin qui n'existe pas encore.
  - *Table séparée (`admins_plateforme`)* — la plus "propre" architecturalement (sépare vraiment deux notions différentes : staff produit vs staff client), mais double la logique d'auth (deux tables à interroger au login, ou un flow de login différent). Pertinent si le projet devient un vrai produit commercial avec une équipe support ; prématuré pour un projet solo pas encore commercialisé.

## `POST /user` : une seule route pour deux usages (inscription publique + ajout d'employé)

**Choix** : garder un seul endpoint `POST /user`, sans `authenticate` au niveau de la route — la distinction entre "inscription publique d'une nouvelle entreprise" et "un admin ajoute un employé" se fait *dans* `createUserService`, selon la présence d'un token valide.

- **Pour** : le frontend (`AuthService.register()`) dépend déjà de cet enchaînement `POST /entreprise` → `POST /user` sans être connecté (impossible d'être connecté avant que son propre compte existe) ; pas de nouvel endpoint à documenter/maintenir.
- **Contre** : la logique de la route est un peu moins lisible d'un coup d'œil sur `user.routes.ts` (il faut lire le service pour comprendre les deux chemins) — compensé par un commentaire explicite à cet endroit.
- **Durci au passage** : avant, n'importe qui pouvait s'ajouter comme `ADMIN` sur une entreprise déjà existante en devinant son `id_entreprise` (aucune vérification). Maintenant, le chemin non-authentifié ne fonctionne que si l'entreprise n'a encore *aucun* utilisateur (`getUsersFromDB(id_entreprise).length === 0`) — donc uniquement pour amorcer une entreprise flambant neuve.
