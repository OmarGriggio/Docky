npm init : 
{
  "name": "docky-api",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "Griggio Omar",
  "license": "MIT",
  "description": "REST API for a SaaS dedicated to small construction companies."
}

La version du projet.

On utilise généralement le Semantic Versioning :

1.0.0

MAJOR.MINOR.PATCH

Exemples :

1.0.0

Première version stable.

1.1.0

Nouvelle fonctionnalité.

1.1.1

Correction d'un bug.

"main": "index.js",
main

Il indique quel est le fichier principal du projet.

Pour une API TypeScript moderne, cette propriété est souvent ignorée, car tu lances directement un fichier comme src/server.ts avec un outil adapté (tsx, ts-node-dev, etc.).

Tu pourras même la supprimer plus tard si elle ne sert pas.

"scripts": {
  "test": "echo \"Error: no test specified\" && exit 1"
}
scripts

À mon avis, c'est la partie la plus utile du package.json.

Les scripts permettent de créer des commandes personnalisées.

Par exemple, aujourd'hui tu pourrais lancer ton serveur avec une commande compliquée.

À la place, tu écris :

"scripts": {
    "dev": "tsx watch src/server.ts"
}

Et tu démarres simplement ton projet avec :

npm run dev

Plus tard, tu auras probablement des scripts comme :

"scripts": {
    "dev": "...",
    "build": "...",
    "start": "...",
    "lint": "...",
    "test": "..."
}

C'est beaucoup plus pratique que de retenir de longues commandes.

Après avoir installé Express :

npm install express

Tu verras apparaître une nouvelle section :

"dependencies": {
    "express": "^5.1.0"
}

Cette section liste les bibliothèques nécessaires au fonctionnement de ton application.

Si tu installes TypeScript uniquement pour développer :

npm install -D typescript

Tu verras une autre section :

"devDependencies": {
    "typescript": "^5.x.x"
}
Pourquoi deux sections ?

C'est une distinction importante.

dependencies

Ce sont les bibliothèques nécessaires pour faire tourner ton application.

Exemples :

Express
PostgreSQL (pg)
JWT
bcrypt

Sans elles, ton API ne fonctionne pas.

devDependencies

Elles servent uniquement pendant le développement.

Exemples :

TypeScript
ESLint
Prettier
outils de test

Quand ton application est déployée, ces outils ne sont plus nécessaires.