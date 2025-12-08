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

# Copiar entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expor porta padrão do Django
EXPOSE 8000

# Comando de inicialização
CMD ["/entrypoint.sh"]
