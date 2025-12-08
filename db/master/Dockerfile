FROM mariadb:10.11

# Usar variables de entorno para credenciales
ENV MYSQL_ROOT_PASSWORD_FILE=/run/secrets/db_root_password
ENV MYSQL_DATABASE=gestion_personal
ENV MYSQL_USER_FILE=/run/secrets/db_user
ENV MYSQL_PASSWORD_FILE=/run/secrets/db_password

# Copiar archivos de configuración
COPY init.sql /docker-entrypoint-initdb.d/
COPY my.cnf /etc/mysql/conf.d/
COPY setup-replication.sh /docker-entrypoint-initdb.d/

# Crear directorios de logs con permisos adecuados
RUN mkdir -p /var/log/mysql && \
    chown -R mysql:mysql /var/log/mysql && \
    chmod 750 /var/log/mysql && \
    chmod 640 /etc/mysql/conf.d/my.cnf && \
    chmod 750 /docker-entrypoint-initdb.d/setup-replication.sh && \
    find /docker-entrypoint-initdb.d/ -type f -name '*.sql' -exec chmod 640 {} \;

# Puerto expuesto
EXPOSE 3306

# Usuario no root para ejecutar el proceso
USER 1001:1001