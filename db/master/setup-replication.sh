#!/bin/sh
# Script que se ejecuta después de que la BD está inicializada

set -e

echo "=== Configurando replicación automática en el master ==="

# Esperar a que MySQL esté completamente listo
while ! mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "SELECT 1" >/dev/null 2>&1; do
  echo "Esperando a que MySQL esté listo..."
  sleep 5
done

echo "MySQL master está listo, configurando replicación..."

# Crear usuario de replicación
mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "
SET SESSION sql_log_bin = 0;
CREATE USER IF NOT EXISTS 'replicador'@'%' IDENTIFIED BY 'replica_password';
GRANT REPLICATION SLAVE ON *.* TO 'replicador'@'%';
FLUSH PRIVILEGES;
SET SESSION sql_log_bin = 1;
"

# Permitir conexión remota como root desde la red de Docker (para dump inicial y pruebas)
mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "
SET SESSION sql_log_bin = 0;
CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY '$MYSQL_ROOT_PASSWORD';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
SET SESSION sql_log_bin = 1;
"

echo "Usuario de replicación creado en el master"

# Crear un script que la réplica pueda usar para configurarse (MariaDB + GTID)
cat > /tmp/configure_replica.sql <<EOF
RESET SLAVE ALL;
CHANGE MASTER TO
  MASTER_HOST='mysql-master',
  MASTER_USER='replicador',
  MASTER_PASSWORD='replica_password',
  MASTER_USE_GTID=current_pos;
START SLAVE;
EOF

echo "Configuración de replicación del master completada"