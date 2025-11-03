FROM mysql:8.0

ENV MYSQL_ROOT_PASSWORD=rootpassword
ENV MYSQL_DATABASE=gestion_personal
ENV MYSQL_USER=admin
ENV MYSQL_PASSWORD=admin123

COPY init.sql /docker-entrypoint-initdb.d/
COPY my.cnf /etc/mysql/conf.d/
COPY setup-replication.sh /docker-entrypoint-initdb.d/

RUN chmod +x /docker-entrypoint-initdb.d/setup-replication.sh

EXPOSE 3306