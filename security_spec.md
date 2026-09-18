# Security Specification & Threat Model

## 1. Data Invariants
- Admin user identity must be authenticated via Firebase Auth or system server calls.
- Categories, subjects, books, and codes are manageable by system admins.
- Public read access is permitted for educational materials (categories, subjects, books).
- Activation codes and student subscription data are sensitive and restricted.

## 2. The Dirty Dozen Payloads (Red Team Scenarios)
1. Injecting a 1MB oversized string as a category name.
2. Unauthenticated user creating an activation code.
3. Student attempting to unblock themselves by modifying `isBlocked`.
4. Overwriting `createdAt` with a fake historical timestamp on a book.
5. Setting invalid activation code `durationDays` to negative numbers.
6. Spoofing ownerId or chatId in student subscriptions.
7. Attempting to wipe out bot settings document.
8. Injecting executable script strings into book title fields.
9. Attempting shadow updates by injecting extra `isAdmin: true` payload to student record.
10. Unauthenticated deletion of book documents.
11. Modifying activation code `isUsed` state without providing a `usedByChatId`.
12. Attempting partial updates on system settings without admin credentials.

## 3. Security Test Assertions
All non-admin write requests to `/codes`, `/students`, `/categories`, `/subjects`, `/books`, and `/settings` MUST return `PERMISSION_DENIED`.
