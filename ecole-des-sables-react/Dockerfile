# 1️⃣ Escolhe a imagem base com Node.js
FROM node:20-alpine

# 2️⃣ Define o diretório de trabalho dentro do container
WORKDIR /app

# 3️⃣ Copia o package.json e package-lock.json para instalar dependências
COPY package*.json ./

# 4️⃣ Instala as dependências
RUN npm install

# 5️⃣ Copia todo o restante do código para o container
COPY . .

# 6️⃣ Expõe a porta que o React usa por padrão
EXPOSE 3000

# 7️⃣ Comando para iniciar a aplicação
CMD ["npm", "start"]
