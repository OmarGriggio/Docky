Why does Express exist?

To understand Express, you first need to understand Node.js.

Node.js lets you run JavaScript outside the browser.

For example, you can create an HTTP server without any library.

With just Node.js:

const http = require('http');

const server = http.createServer((req, res) => {
    res.end('Hello');
});

server.listen(3000);

That works.

But imagine you want to:

handle 50 routes;
parse JSON;
handle errors;
use middlewares;
organize your code.

It quickly gets complicated.

What problem does Express solve?

Express is a framework that simplifies building a web server and a REST API.

With Express, the same thing becomes:

app.get('/', (req, res) => {
    res.send('Hello');
});

Much more readable.

Express gives you, among other things:

a routing system;
middlewares;
request/response handling;
a simple architecture.

In short:

Node.js provides the engine, Express provides the tools to easily build an API.
