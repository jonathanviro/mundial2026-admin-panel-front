FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5174
# Vite dev server escucha en todas las interfaces para que Docker lo exponga
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5174"]
