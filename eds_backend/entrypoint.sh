#!/bin/bash
set -e

# Espera o banco PostgreSQL ficar disponível
echo "Esperando o banco de dados $DB_HOST:$DB_PORT..."
while ! nc -z $DB_HOST $DB_PORT; do
  sleep 1
done
echo "Banco de dados disponível!"

# Aplica migrations do Django
echo "Aplicando migrations..."
python3 manage.py makemigrations
python3 manage.py migrate

# Inicializa usuários padrão
echo "Inicializando usuários padrão..."
python3 init_db.py
python3 populate_villages.py
python3 populate_languages.py

# Inicia o servidor Django
echo "Iniciando servidor Django..."
exec python3 manage.py runserver 0.0.0.0:5000
