#!/bin/bash
# Project Setup on VM
# Clone repository and set up Python environment

set -e

echo "========================================="
echo "Project Repository Setup"
echo "========================================="
echo ""

# Create projects directory
mkdir -p ~/projects
cd ~/projects

# Prompt for repository URL
read -p "Enter your Git repository URL: " REPO_URL

# Clone repository
echo "Cloning repository..."
git clone $REPO_URL FCS || {
    echo "Clone failed. If repo already exists, pulling latest..."
    cd FCS
    git pull
    cd ..
}

cd FCS

echo ""
echo "Creating Python virtual environment..."
python3 -m venv venv

echo "Activating virtual environment..."
source venv/bin/activate

echo "Upgrading pip..."
pip install --upgrade pip

echo "Installing project dependencies..."
pip install -r requirements.txt

echo ""
echo "Creating .env file from example..."
cp .env.example .env

echo ""
echo "⚠️  IMPORTANT: Edit the .env file with actual credentials"
echo ""
echo "nano .env"
echo ""
echo "Update these values:"
echo "  - SECRET_KEY (generate new one)"
echo "  - DATABASE_URL (use: postgresql://job_user:SecureJobPass2026!@localhost:5432/job_platform)"
echo "  - ENCRYPTION_KEY (generate with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\")"
echo "  - SMTP credentials (your email settings)"
echo ""

# Generate keys helper
echo "Generating SECRET_KEY..."
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"

echo ""
echo "Generating ENCRYPTION_KEY..."
python3 -c "from cryptography.fernet import Fernet; print('ENCRYPTION_KEY=' + Fernet.generate_key().decode())"

echo ""
echo "✅ Project setup complete!"
echo ""
echo "Location: ~/projects/FCS"
echo "Virtual environment: source ~/projects/FCS/venv/bin/activate"
