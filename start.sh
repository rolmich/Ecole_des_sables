#!/bin/bash
# Script to start Docker containers in a portable way

set -e  # Exit if any command fails

# Path to the project folder (assumes the script is in the project root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || { echo "Error: Unable to access the project folder."; exit 1; }

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Please install Docker."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Docker Compose not found. Please install Docker Compose."
    exit 1
fi

# Run Docker Compose
echo "Starting Docker containers..."
sudo docker compose up -d --build

echo "Docker containers started successfully!"
