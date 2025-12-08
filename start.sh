#!/bin/bash
# Script para subir containers Docker

# Caminho até a pasta do docker-compose
cd /home/luis/Desktop/IMT\ Atlantique/Ecole_des_sables || exit

# Executa Docker Compose
sudo docker compose up -d --build
