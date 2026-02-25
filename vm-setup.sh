#!/bin/bash
# VM Initial Setup Script
# Run this script on the Ubuntu VM after SSH connection

set -e  # Exit on error

echo "========================================="
echo "Secure Job Platform - VM Setup Script"
echo "========================================="
echo ""

# Update system
echo "Step 1: Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Python 3.10+
echo ""
echo "Step 2: Installing Python and dependencies..."
sudo apt install -y python3 python3-pip python3-venv python3-dev build-essential

# Verify Python version
python3 --version

# Install PostgreSQL
echo ""
echo "Step 3: Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib libpq-dev

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Nginx
echo ""
echo "Step 4: Installing Nginx..."
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Install Git
echo ""
echo "Step 5: Installing Git..."
sudo apt install -y git

# Install Redis
echo ""
echo "Step 6: Installing Redis..."
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Install other useful tools
echo ""
echo "Step 7: Installing additional tools..."
sudo apt install -y curl wget vim nano htop net-tools

# Install OpenSSL for certificate generation
sudo apt install -y openssl

echo ""
echo "========================================="
echo "✅ Basic software installation complete!"
echo "========================================="
echo ""
echo "Installed:"
echo "- Python: $(python3 --version)"
echo "- PostgreSQL: $(psql --version | head -n1)"
echo "- Nginx: $(nginx -v 2>&1)"
echo "- Git: $(git --version)"
echo "- Redis: $(redis-server --version)"
echo ""
echo "Next steps:"
echo "1. Set up PostgreSQL database"
echo "2. Clone your project repository"
echo "3. Configure SSL certificates"
echo "4. Set up virtual environment"
