# Application to try with Kpack

## Initialize the project

```bash
mkdir pack-express-notes && cd pack-express-notes
```

```bash
gh repo create pack-express-notes --public
git remote add origin https://github.com/KAMRON-DEVELOPER/pack-express-notes.git
git branch -M master
git push -u origin master
```

```bash
npm init -y
```

```bash
npm install express dotenv
npm install -D typescript ts-node @types/node @types/express nodemon
```

- ts-node — Enables running TypeScript files directly without pre-compiling to JavaScript
- @types/node — Provides TypeScript type definitions for Node.js core modules
- @types/express — Adds TypeScript type definitions for the Express framework
- nodemon — Automatically restarts the server when file changes are detected during development

Configure TypeScript

```bash
npx tsc --init
```

## `package.json` adjustments

```json
{
  "main": "app.ts",
  "scripts": {
    "dev": "nodemon src/app.ts",
    "run": "tsc && node dist/app.js",
    "build": "tsc",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "type": "module",
}
```

## `tsconfig.ts` adjustments

```json
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "lib": ["esnext"],
    "types": ["node"],
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```
