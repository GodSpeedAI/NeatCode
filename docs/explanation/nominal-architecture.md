# Explanation: Nominal Architecture (Architecture Cosplay)

The most frequent architectural verdict returned when auditing AI-assisted software repositories is:

> **Verdict: Nominal.**
> The architectural vocabulary is present; the functional engineering property is absent.

This document explains what nominal architecture is, why AI coding models gravitate toward it, and how NeatCode detects and diagnoses it.

---

## What Is Nominal Architecture?

Architecture consists of **functional invariants and constraints**, not folder names.

A codebase exhibits **Nominal Architecture** (colloquially termed *architecture cosplay*) when it adopts the outward cosmetic forms of a sophisticated software pattern without implementing any of the boundary constraints or decoupling guarantees that earn the pattern's cost.

### Example: Nominal Clean Architecture
```text
src/
├── domain/
│   └── user.ts         <-- imports { prisma } from '../infra/db'
├── usecases/
│   └── register.ts     <-- receives express.Request directly
└── infra/
    └── db.ts           <-- exports raw prisma client
```
The developer or AI agent organized files into `domain/`, `usecases/`, and `infra/`. The README proudly announces that the project uses "Clean Architecture". 

Yet `domain/user.ts` imports the database client directly! The core invariant of Clean Architecture — *the domain layer must never depend on infrastructure* — has been broken. The project pays the cognitive cost of navigating three directory tiers without reaping any of the testability or database independence that Clean Architecture promises.

---

## Why AI Coding Agents Gravitate Toward Nominal Architecture

AI coding agents are trained on massive code corpora. In training data, professional codebases frequently feature layers, interfaces, DTOs, factories, and adapters.

When an LLM is prompted to build a feature, its statistical prior is to mimic the *shape* of professional software:
1. It knows that "good code has interfaces", so it creates an `IUserRepository` interface with one method and one implementation.
2. It knows that "good code has layers", so it creates a `UserService` that accepts a DTO, converts it to an entity, and calls a repository.
3. However, the model lacks a physical mental model of the running production system. It does not naturally think about connection pool exhaustion, database schema locks, or circular build cycles.

The result is plausible, sophisticated-looking ceremony that forwards data without adding translation, validation, or lifecycle management.

---

## Common Nominal Signatures and Diagnostic Checks

| Architectural Pattern | Claimed Benefit | Nominal Reality (The Cosplay) | The 1-Second Check |
| :--- | :--- | :--- | :--- |
| **Hexagonal / Ports & Adapters** | Decoupling core domain from external services | Production code instantiates the concrete adapter directly; the interface port is only used by test doubles. | Search production call sites: is `new StripePaymentAdapter()` constructed directly in domain code? |
| **Layered Architecture** | Independent domain logic testable without a database | `domain/` imports database ORM models or SQL client instances. | Run grep: `grep -rn "from '../infra"` inside `src/domain/`. |
| **Event-Driven Architecture** | Temporal and process decoupling | The event emitter dispatches synchronously and awaits all listener promises in the HTTP request lifecycle. | Check `eventEmitter.emit()`: is it preceded by `await` and synchronously blocking the handler? |
| **Microservices / Bounded Contexts** | Independent deployability and localized data models | Multiple services share the exact same relational database schema and query each other's tables. | Check database schemas: do service A and service B both run migrations against table `users`? |

---

## How NeatCode Responds to Nominal Architecture

When NeatCode encounters nominal architecture during an `audit` or `study`, it does **not** automatically demand a massive multi-week refactor to make the code conform to the documented style.

Instead, NeatCode offers **two honest choices**:
1. **Option A (Restore Conformance)**: Enforce the architectural boundary with automated dependency linting or architecture tests (`test/architecture.test.ts`), and invert improper dependencies.
2. **Option B (Document Reality and Simplify)**: Drop the architectural pretension. Inline the pass-through layers, collapse the artificial directories into a simple transaction script or vertical slice, and update `README.md` to describe what the code actually does.

Often, **Option B is the correct, senior-engineering decision**. Eliminating unearned ceremony makes the codebase significantly easier to read and maintain.
