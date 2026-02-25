#!/bin/bash
# SSL Certificate Generation Script
# Creates self-signed certificate for HTTPS

set -e

echo "========================================="
echo "SSL Certificate Generation"
echo "========================================="
echo ""

# Create SSL directory
sudo mkdir -p /etc/nginx/ssl
cd /etc/nginx/ssl

# Generate self-signed certificate
echo "Generating self-signed SSL certificate..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/job-platform.key \
  -out /etc/nginx/ssl/job-platform.crt \
  -subj "/C=IN/ST=Delhi/L=Delhi/O=IIIT-Delhi/OU=FCS/CN=192.168.3.40"

# Set permissions
sudo chmod 600 /etc/nginx/ssl/job-platform.key
sudo chmod 644 /etc/nginx/ssl/job-platform.crt

echo ""
echo "✅ SSL certificates created!"
echo ""
echo "Certificate: /etc/nginx/ssl/job-platform.crt"
echo "Private Key: /etc/nginx/ssl/job-platform.key"
echo ""
echo "Next: Configure Nginx to use these certificates"
