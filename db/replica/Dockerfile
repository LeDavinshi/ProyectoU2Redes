FROM mariadb:10.11

ENV MYSQL_ROOT_PASSWORD=rootpassword
ENV MYSQL_DATABASE=gestion_personal

COPY my-replica.cnf /etc/mysql/conf.d/
COPY setup-replica.sh /docker-entrypoint-initdb.d/

RUN chmod +x /docker-entrypoint-initdb.d/setup-replica.sh

EXPOSE 3306