# Backend Scripts

This directory contains utility and maintenance scripts for the Headhunter backend.

## Directory Structure

### `debug/`
Debugging and inspection scripts:
- `check_cv_path.py` - Verify CV file paths
- `check_jobs.py` - Inspect job records
- `check_user.py` - Check user accounts
- `verify_password.py` - Password verification utility

### `maintenance/`
Database and system maintenance scripts:
- `create_super_admin.py` - Create admin user
- `restore_admin.py` - Restore admin access
- `migrate_job_status.py` - Migrate job status fields
- `sync_departments.py` - Synchronize department data

## Usage

All scripts should be run from the backend directory inside the Docker container:

```bash
# Debug scripts
docker exec headhunter_backend python scripts/debug/check_user.py

# Maintenance scripts
docker exec headhunter_backend python scripts/maintenance/create_super_admin.py
```

## Note

These are utility scripts for development and maintenance. They are not part of the main application code.
