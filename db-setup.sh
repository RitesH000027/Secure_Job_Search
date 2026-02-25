#!/bin/bash
# Database Setup Script
# Run after vm-setup.sh completes

set -e

echo "========================================="
echo "PostgreSQL Database Setup"
echo "========================================="
echo ""

# Database configuration
DB_NAME="job_platform"
DB_USER="job_user"
DB_PASSWORD="SecureJobPass2026!"

echo "Creating database and user..."

# Switch to postgres user and create database
sudo -u postgres psql << EOF
-- Create database
CREATE DATABASE ${DB_NAME};

-- Create user with password
CREATE USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASSWORD}';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Make user owner of database
ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};

-- List databases to verify
\l

-- Exit
\q
EOF

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Database credentials:"
echo "  Database: ${DB_NAME}"
echo "  User: ${DB_USER}"
echo "  Password: ${DB_PASSWORD}"
echo "  Host: localhost"
echo "  Port: 5432"
echo ""
echo "Connection string:"
echo "postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
echo ""

# Test connection
echo "Testing database connection..."
PGPASSWORD="${DB_PASSWORD}" psql -U ${DB_USER} -d ${DB_NAME} -h localhost -c "SELECT version();" || echo "❌ Connection test failed"

echo ""
echo "Save these credentials in your .env file on the VM!"
