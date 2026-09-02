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

The project's version.

Semantic Versioning is generally used:

1.0.0

MAJOR.MINOR.PATCH

Examples:

1.0.0

First stable version.

1.1.0

New feature.

1.1.1

Bug fix.

"main": "index.js",
main

It indicates what the project's main file is.

For a modern TypeScript API, this property is often ignored, since you launch a file like src/server.ts directly with a suitable tool (tsx, ts-node-dev, etc.).

You can even remove it later if it's not used.

"scripts": {
  "test": "echo \"Error: no test specified\" && exit 1"
}
scripts

In my opinion, this is the most useful part of package.json.

Scripts let you create custom commands.

For example, today you might start your server with a complicated command.

Instead, you write:

"scripts": {
    "dev": "tsx watch src/server.ts"
}

And you simply start your project with:

npm run dev

Later, you'll probably have scripts like:

"scripts": {
    "dev": "...",
    "build": "...",
    "start": "...",
    "lint": "...",
    "test": "..."
}

Much more convenient than remembering long commands.

After installing Express:

npm install express

You'll see a new section appear:

"dependencies": {
    "express": "^5.1.0"
}

This section lists the libraries your application needs to run.

If you install TypeScript only for development:

npm install -D typescript

You'll see another section:

"devDependencies": {
    "typescript": "^5.x.x"
}
Why two sections?

This is an important distinction.

dependencies

These are the libraries needed to run your application.

Examples:

Express
PostgreSQL (pg)
JWT
bcrypt

Without them, your API doesn't work.

devDependencies

These are only used during development.

Examples:

TypeScript
ESLint
Prettier
test tools

Once your application is deployed, these tools are no longer needed.
