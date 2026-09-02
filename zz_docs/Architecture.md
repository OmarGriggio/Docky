# 2 - Architecture

## 2.1 - General architecture & decisions

| Decision          | Choice                    | Justification                                                                    |
| ----------------- | ------------------------- | ---------------------------------------------------------------------------------|
| Frontend          | Angular                   | Familiarity with the framework and an architecture suited to business apps       |
| Backend           | Node.js + Express         | Lightweight, widely-used REST API                                                |
| Database          | PostgreSQL                | Robust, relational, suited to business data                                      |
| Data access       | Native SQL via Repository | Mastery of SQL, full control over queries, simplicity of the tech stack          |
| Authentication    | JWT                       | Standard for a REST API                                                          |
| Deployment        | Docker Compose            | Reproducible environment                                                         |

## 2.2 - Backend architecture

controllers/
services/
repositories/
routes/
middlewares/
validators/
config/

## 2.3 - Frontend architecture

core/
shared/
features/
layout/

## 2.4 - Database

Database
Tables
Relations
Constraints

## 2.5 - Authentication

JWT
Middleware
Roles
Permissions
