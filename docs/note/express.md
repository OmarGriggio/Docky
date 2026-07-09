Pourquoi Express existe-t-il ?

Pour comprendre Express, il faut d'abord comprendre Node.js.

Node.js te permet d'exécuter du JavaScript en dehors du navigateur.

Par exemple, tu peux créer un serveur HTTP sans aucune bibliothèque.

Avec uniquement Node.js :

const http = require('http');

const server = http.createServer((req, res) => {
    res.end('Hello');
});

server.listen(3000);

Ça fonctionne.

Mais imagine que tu veuilles :

gérer 50 routes ;
parser du JSON ;
gérer les erreurs ;
utiliser des middlewares ;
organiser ton code.

Ça devient vite compliqué.

Quel problème Express résout-il ?

Express est un framework qui simplifie la création d'un serveur web et d'une API REST.

Avec Express, la même chose devient :

app.get('/', (req, res) => {
    res.send('Hello');
});

Beaucoup plus lisible.

Express t'apporte notamment :

un système de routes ;
des middlewares ;
la gestion des requêtes/réponses ;
une architecture simple.

En résumé :

Node.js fournit le moteur, Express fournit les outils pour construire facilement une API.