# 💾 Lifeserv Database Backup & Recovery Plan

This document outlines the backup strategy for the production PostgreSQL database.

## 1. Automated Backups (Railway)
Since the database is hosted on **Railway**, automatic backups are enabled by default.
- **Retention:** Railway maintains daily backups.
- **Manual Trigger:** Go to the Railway Dashboard -> Database Service -> Backups -> "Generate Backup".

## 2. Manual CLI Backups
For critical deployments, perform a manual dump using `pg_dump`.

### Backup Command:
```bash
# Export the database to a .sql file
pg_dump "postgresql://postgres:password@host:port/railway" > backup_$(date +%F).sql
```

### Restore Command:
```bash
# Restore from a .sql file (CAUTION: Overwrites existing data)
psql "postgresql://postgres:password@host:port/railway" < backup_file.sql
```

## 3. Disaster Recovery
In the event of a critical failure:
1. Identify the latest stable backup in Railway.
2. Spin up a new PostgreSQL instance if necessary.
3. Import the SQL dump or use Railway's "Restore" feature.
4. Update the `DATABASE_URL` in `.env.production`.
5. Restart the backend services.

## 4. Verification
- Backup integrity should be verified monthly by restoring to a local/staging environment.
- Ensure the `deletedAt` soft-delete columns are preserved in the backup.
