# PostgreSQL Database Migrations & Seeds

This document explains how to manage database migrations and seeds in the Jomnus backend.

## Overview

The project uses **TypeORM** for database management with the following setup:

- **Development**: `synchronize: true` - Auto-creates/updates tables (for fast iteration)
- **Production**: `synchronize: false` - Uses manual migrations (safe, version-controlled)
- **Seeds**: Initial data scripts for populating default/sample data

## Installation

Make sure you have `ts-node` installed:

```bash
npm install
```

## Running Migrations

### Run all pending migrations:

```bash
npm run migration:run
```

This runs all migrations from the `src/migrations` folder in sequence.

### Revert the last migration:

```bash
npm run migration:revert
```

### Check migration status:

```bash
npm run migration:show
```

This shows which migrations have been run and which are pending.

## Creating New Migrations

### Option 1: Generate from Entity Changes (Recommended)

After modifying an entity file, generate a migration that reflects the changes:

```bash
npm run migration:generate -- src/migrations/AddFieldToUsers
```

This automatically compares your entities to the database schema and creates a migration.

### Option 2: Create Empty Migration

For manual SQL or complex changes:

```bash
npm run migration:create -- src/migrations/AddNewTable
```

This creates an empty migration file you can fill in manually.

## Seeding the Database

### Run all seeds:

```bash
npm run seed
```

The seed file (`src/seeds/seed.ts`) will:

- Create an admin user (email: `admin@jomnus.com`)
- Create 3 sample users for testing
- Skip creation if data already exists

### Custom Seeds

To add more seed data:

1. Edit `src/seeds/seed.ts`
2. Add your seed logic within the `seedDatabase()` function
3. Run `npm run seed`

## Workflow Example

### First Time Setup

```bash
# Install dependencies
npm install

# Run migrations to create schema
npm run migration:run

# Populate with initial data
npm run seed

# Start the application
npm run start:dev
```

### After Modifying an Entity

```bash
# Update your entity file (e.g., src/auth/entity/user.entity.ts)

# Generate migration automatically
npm run migration:generate -- src/migrations/UpdateUserEntity

# Review the migration in src/migrations/
# Make edits if needed

# Run the new migration
npm run migration:run

# Done! Commit the migration file to git
```

### Docker Setup

The docker-compose automatically:

1. ✅ Starts PostgreSQL
2. ✅ Runs all pending migrations
3. ✅ Starts the backend API

```bash
docker-compose up
```

## Best Practices

✅ **DO:**

- Commit migration files to git
- Use version-controlled migrations for prod
- Test migrations before deploying
- Keep seeds for common test data
- Review generated migrations before running

❌ **DON'T:**

- Use `synchronize: true` in production
- Modify migration files after they're committed
- Run migrations manually in production
- Delete migration files
- Store sensitive data in seeds

## Troubleshooting

### "Migration already exists" error

Don't modify committed migration files. Create a new migration instead:

```bash
npm run migration:generate -- src/migrations/FixPreviousChange
```

### Migrations won't run

Check:

1. Database connection: `.env` file is correct and PostgreSQL is running
2. File paths in `ormconfig.ts` match your project structure
3. Run `npm run migration:show` to see what's pending

### Seed script errors

Make sure:

1. Database connection works: `npm run migration:run` first
2. Entity paths in `seed.ts` are correct
3. Run with: `npm run seed` (not `ts-node src/seeds/seed.ts`)

## File Structure

```
src/
├── migrations/
│   └── 1704067200000-CreateInitialSchema.ts
├── seeds/
│   └── seed.ts
└── ... (other modules)
```

## Environment Variables

Required in `.env`:

```
DB_HOST=db
DB_PORT=5432
DB_USERNAME=myuser
DB_PASSWORD=mypassword
DB_NAME=jomnus_db
NODE_ENV=development
```

For production, set `NODE_ENV=production` to disable `synchronize`.

---

For more info, see [TypeORM Migrations](https://typeorm.io/migrations) and [TypeORM Seeding](https://typeorm.io/migrations#creating-a-new-migration).
