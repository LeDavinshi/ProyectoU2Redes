#!/bin/bash
# Script que se ejecuta después de que la BD está inicializada

set -e

echo "=== Configurando replicación automática en el master ==="

# Esperar a que MySQL esté completamente listo
while ! mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SELECT 1" > /dev/null 2>&1; do
    echo "Esperando a que MySQL esté listo..."
    sleep 5
done

echo "MySQL master está listo, configurando replicación..."

# Crear usuario de replicación
mysql -u root -p$MYSQL_ROOT_PASSWORD -e "
CREATE USER IF NOT EXISTS 'replicador'@'%' IDENTIFIED BY 'replica_password';
GRANT REPLICATION SLAVE ON *.* TO 'replicador'@'%';
FLUSH PRIVILEGES;
"

echo "Usuario de replicación creado en el master"

# Crear un script que la réplica pueda usar para configurarse
cat > /tmp/configure_replica.sql << EOF
RESET SLAVE;
CHANGE MASTER TO
MASTER_HOST='mysql-master',
MASTER_USER='replicador',
MASTER_PASSWORD='replica_password',
MASTER_AUTO_POSITION=1;
START SLAVE;
EOF

echo "Configuración de replicación del master completada"