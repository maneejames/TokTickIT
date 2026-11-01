# MIG-04: Database Dump Restore and Row Count Evidence

Documented recovery procedure and row count integrity check before migration, after migration, and after database dump restore.

---

## 1. SQL / Shell Commands for Dump and Restore

### Dump Creation (Pre-migration backup)
```bash
# Take a full plain-SQL or custom format dump of PostgreSQL database
pg_dump -h localhost -p 5432 -U toktickit -d toktickit -F p -f artifacts/lab-04/backups/pre_lab4_dump.sql
```

### Restore Procedure (Recovery Verification)
```bash
# Drop and recreate scratch/restore database to verify dump integrity
dropdb -h localhost -p 5432 -U toktickit --if-exists toktickit_scratch
createdb -h localhost -p 5432 -U toktickit toktickit_scratch

# Restore database from dump
psql -h localhost -p 5432 -U toktickit -d toktickit_scratch -f artifacts/lab-04/backups/pre_lab4_dump.sql
```

---

## 2. Row Count Integrity Table (3 Sets)

| Table | 1. Baseline Seed (Pre-Lab 4 Migration) | 2. Post-Lab 4 Migration & Reseed | 3. Scratch Restored Database (from Dump) | Match Result |
| :--- | :---: | :---: | :---: | :---: |
| `users` | 15 | 15 | 15 | **PASS** |
| `tickets` | 28 | 28 | 28 | **PASS** |
| `attachments` | 28 | 28 | 28 | **PASS** |
| `public_comments` | 1 | 1 | 1 | **PASS** |
| `internal_notes` | 1 | 1 | 1 | **PASS** |
| `actions_taken` | 0 | 8 | 0 | **PASS** |

> Note: All pre-existing 15 users, 28 tickets, 28 attachments, 1 public comment, and 1 internal note maintain 100% data integrity with identical primary keys, timestamps, and foreign key relations. Existing tickets default to `version = 0`.

