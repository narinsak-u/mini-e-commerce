# ShopFlow - AI Coding Agent Implementation Plan

See sections: Objective, Tech Stack, Folder Structure, Modules, Database, Redis, RabbitMQ, REST APIs, 13 Development Phases, AI Coding Rules.

## Objective
Build a production-ready mini e-commerce with Express.js, TypeScript, Clean Architecture, PostgreSQL, Drizzle, Redis, RabbitMQ.

## Tech Stack
- React + Vite + Tailwind
- Express.js + TS
- PostgreSQL + Drizzle
- Redis
- RabbitMQ
- JWT
- Docker

## Folder Structure
```text
src/domain
src/application
src/infrastructure
src/presentation
src/tests
```

## Development Phases
1. Bootstrap
2. Authentication
3. Categories
4. Products
5. Cart
6. Checkout
7. Inventory Worker
8. Payment Worker
9. Notification Worker
10. Analytics Worker
11. Redis Optimization
12. Admin Dashboard
13. Production Hardening

## AI Coding Rules
- Interfaces first
- Domain before infrastructure
- One use case per prompt
- Tests before next phase
- DI everywhere
- Never violate Clean Architecture


---
# ShopFlow — Mini E-commerce Implementation Plan

> **Architecture:** Modular Monolith + Clean Architecture + Event-Driven Architecture
> **Backend:** Express.js + TypeScript + PostgreSQL + Drizzle ORM + Redis + RabbitMQ
> **Frontend:** React + Vite + TailwindCSS + TanStack Query + Zustand

---

# 1. Project Overview

## Goal

Build a production-ready mini e-commerce application that demonstrates modern backend engineering concepts while remaining small enough to finish within a few weeks.

The project should focus on:

* Clean Architecture
* SOLID Principles
* Repository Pattern
* Dependency Injection
* Event-Driven Architecture
* RabbitMQ
* Redis
* Background Workers
* Docker
* Testing

This is **not** a CRUD application.

Every feature should simulate how a real e-commerce system works.

---

# 2. Functional Requirements

### Authentication

* Register
* Login
* Refresh Token
* Logout
* JWT Authentication
* Role-based Authorization

---

### Product

Customer can

* Browse products
* Search products
* Filter products
* View product details

Admin can

* Create products
* Update products
* Delete products
* Manage inventory

---

### Categories

* Create Category
* Update Category
* Delete Category
* List Categories

---

### Shopping Cart

Customer can

* Add item
* Remove item
* Update quantity
* Clear cart

Cart should survive page refresh.

---

### Checkout

Customer

↓

Create Order

↓

Reserve Stock

↓

Request Payment

↓

Receive Confirmation

---

### Orders

Customer

* View Orders
* View Order Detail
* Cancel Order

Admin

* Update Status

Status

```
Pending

Paid

Packing

Shipping

Completed

Cancelled
```

---

### Notifications

Customer receives

* Payment Success
* Order Confirmed
* Shipping
* Delivered

---

### Admin Dashboard

* Revenue
* Total Orders
* Best Selling Products
* Inventory
* Recent Orders

---

# 3. Non-functional Requirements

Performance

* API Response < 300ms

Scalability

* Multiple workers

Reliability

* Retry failed jobs

Security

* JWT
* Password Hashing
* Rate Limiting

Maintainability

* Clean Architecture

---

# 4. System Architecture

```
                     React

                       │

                REST API

                       │

               Express Server

────────────────────────────────────

Presentation Layer

Controllers

Routes

Validators

────────────────────────────────────

Application Layer

Use Cases

Interfaces

DTOs

────────────────────────────────────

Domain Layer

Entities

Business Rules

Repository Interfaces

────────────────────────────────────

Infrastructure Layer

PostgreSQL

Drizzle

RabbitMQ

Redis

Workers

Email
```

---

# 5. Clean Architecture

```
src

├── domain

├── application

├── infrastructure

└── presentation
```

### Domain

Contains

* Entities
* Value Objects
* Business Rules
* Repository Interfaces

No framework dependency.

---

### Application

Contains

* Use Cases
* Interfaces
* DTO

Coordinates business logic.

---

### Infrastructure

Contains

* PostgreSQL
* Redis
* RabbitMQ
* Email
* File Storage

Implements interfaces.

---

### Presentation

Contains

* Express Routes
* Controllers
* Middleware
* Validation

---

# 6. Modules

```
Authentication

Users

Categories

Products

Cart

Orders

Payments

Inventory

Notifications

Analytics

Admin
```

Each module owns

```
Entity

Repository

Use Cases

Controller

Routes
```

---

# 7. Database

Main Tables

```
users

products

categories

cart

cart_items

orders

order_items

payments

inventory_logs

notifications
```

---

# 8. Redis Responsibilities

Redis should **never replace PostgreSQL**.

Use Redis for

### Cache

```
Products

Categories

Homepage

Best Sellers
```

---

### Shopping Cart

```
cart:user:15
```

---

### Session

```
session:user:15
```

---

### Rate Limiting

```
rate:user:15
```

---

### Inventory Cache

```
inventory:product:18
```

---

### Best Seller Ranking

Redis Sorted Set

```
leaderboard:sales
```

---

# 9. RabbitMQ Responsibilities

RabbitMQ handles

```
Long-running tasks

Background jobs

Event-driven communication
```

---

Exchange

```
shop.exchange
```

Queues

```
order.created

payment.request

payment.completed

inventory.updated

notification.send

analytics

dead-letter
```

---

Workflow

```
Checkout

↓

Create Order

↓

Publish Event

↓

Return Response

↓

RabbitMQ

↓

Workers
```

---

# 10. Workers

Inventory Worker

Responsibilities

* Validate Stock
* Reduce Stock
* Save Inventory Log

---

Payment Worker

Responsibilities

* Mock Payment
* Update Payment
* Update Order
* Publish Payment Completed

---

Notification Worker

Responsibilities

* Email
* Push Notification
* In-app Notification

---

Analytics Worker

Responsibilities

* Revenue
* Best Sellers
* Dashboard Statistics

---

# 11. API Design

Authentication

```
POST /auth/register

POST /auth/login

POST /auth/logout

POST /auth/refresh
```

Products

```
GET /products

GET /products/:id

POST /products

PATCH /products/:id

DELETE /products/:id
```

Categories

```
GET /categories

POST /categories

PATCH /categories/:id

DELETE /categories/:id
```

Cart

```
GET /cart

POST /cart/items

PATCH /cart/items/:id

DELETE /cart/items/:id
```

Checkout

```
POST /checkout
```

Orders

```
GET /orders

GET /orders/:id

PATCH /orders/:id
```

Notifications

```
GET /notifications
```

---

# 12. Development Roadmap

## Phase 1

Project Setup

Deliverables

* Express
* TypeScript
* Docker
* PostgreSQL
* Drizzle
* RabbitMQ
* Redis
* Health Check

---

## Phase 2

Authentication Module

* JWT
* Register
* Login
* RBAC

---

## Phase 3

Category Module

* CRUD
* Validation

---

## Phase 4

Product Module

* CRUD
* Search
* Pagination
* Filtering

---

## Phase 5

Redis Integration

* Product Cache
* Category Cache
* Session
* Rate Limit

---

## Phase 6

Shopping Cart

* Add Item
* Remove Item
* Update Quantity
* Redis Cart

---

## Phase 7

Checkout

* Create Order
* Publish RabbitMQ Event

---

## Phase 8

Inventory Worker

* Consume Order Event
* Reduce Stock
* Log Inventory

---

## Phase 9

Payment Worker

* Mock Payment
* Update Order
* Publish Success Event

---

## Phase 10

Notification Worker

* Email
* In-App Notification

---

## Phase 11

Analytics Worker

* Revenue
* Dashboard
* Best Sellers

---

## Phase 12

Admin Dashboard

* Products
* Orders
* Revenue
* Inventory

---

## Phase 13

Production Hardening

* Retry Strategy
* Dead Letter Queue
* Idempotent Consumers
* Optimistic Locking
* Request Logging
* Error Handling
* Monitoring

---