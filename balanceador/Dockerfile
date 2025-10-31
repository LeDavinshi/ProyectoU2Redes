# Imagen base liviana
FROM nginx:alpine

# Copiamos la configuración del balanceador
COPY nginx.conf /etc/nginx/nginx.conf

# Exponemos los puertos HTTP y HTTPS
EXPOSE 80 443

# Comando por defecto
CMD ["nginx", "-g", "daemon off;"]
