FROM mariadb:10.11

# Usar variables de entorno para credenciales
ENV MYSQL_ROOT_PASSWORD_FILE=/run/secrets/db_root_password
ENV MYSQL_DATABASE=gestion_personal

# Copiar archivos de configuración
COPY my-replica.cnf /etc/mysql/conf.d/
COPY setup-replica.sh /docker-entrypoint-initdb.d/

# Crear directorios de logs con permisos adecuados
RUN mkdir -p /var/log/mysql && \
    chown -R mysql:mysql /var/log/mysql && \
    chmod 750 /var/log/mysql && \
    chmod 640 /etc/mysql/conf.d/my-replica.cnf && \
    chmod 750 /docker-entrypoint-initdb.d/setup-replica.sh

# Puerto expuesto
EXPOSE 3306

# Usuario no root para ejecutar el proceso
USER 1001:1001