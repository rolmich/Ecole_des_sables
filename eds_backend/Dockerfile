# Usar Python 3.11
FROM python:3.11-bullseye

# Diretório de trabalho da aplicação
WORKDIR /app

# Instalar dependências do sistema necessárias para psycopg2, Pillow e netcat
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    libjpeg-dev \
    zlib1g-dev \
    libtiff5-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libwebp-dev \
    tcl8.6-dev \
    tk8.6-dev \
    python3-tk \
    libharfbuzz-dev \
    libfribidi-dev \
    netcat \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependências Python
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

# Copiar todo o código da aplicação
COPY . .

# Definir variáveis de ambiente (ajuste conforme docker-compose)
ENV DB_HOST=meu-postgres
ENV DB_PORT=5432

# Expor porta padrão do Django
EXPOSE 5000

# Comando de inicialização direto no Dockerfile
CMD bash -c "\
echo 'Esperando o banco de dados $DB_HOST:$DB_PORT...'; \
while ! nc -z \$DB_HOST \$DB_PORT; do sleep 1; done; \
echo 'Banco de dados disponível!'; \
echo 'Aplicando migrations...'; \
python3 manage.py makemigrations; \
python3 manage.py migrate; \
echo 'Inicializando dados padrão...'; \
python3 init_db.py; \
python3 populate_villages.py; \
python3 populate_languages.py; \
echo 'Iniciando servidor Django...'; \
exec python3 manage.py runserver 0.0.0.0:5000"
