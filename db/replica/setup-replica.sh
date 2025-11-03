#!/bin/bash
# Script que configura automáticamente la réplica

set -e

echo "=== Iniciando configuración automática de réplica ==="

# Función para configurar la replicación
configure_replication() {
    echo "Configurando replicación..."
    
    # Esperar a que el master esté listo
    echo "Esperando a que el master esté disponible..."
    while ! mysql -h mysql-master -u root -p$MYSQL_ROOT_PASSWORD -e "SELECT 1" > /dev/null 2>&1; do
        echo "Master no disponible, esperando..."
        sleep 10
    done
    
    echo "Master disponible, procediendo con la configuración..."

    # Asegurar usuarios locales necesarios (sin escribir en binlog) para evitar conflictos
    mysql -u root -p$MYSQL_ROOT_PASSWORD -e "
    SET SESSION sql_log_bin = 0;
    CREATE USER IF NOT EXISTS 'replicador'@'%' IDENTIFIED BY 'replica_password';
    GRANT REPLICATION SLAVE ON *.* TO 'replicador'@'%';
    CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY '$MYSQL_ROOT_PASSWORD';
    GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;
    CREATE USER IF NOT EXISTS 'admin'@'%' IDENTIFIED BY 'admin123';
    GRANT ALL PRIVILEGES ON gestion_personal.* TO 'admin'@'%';
    FLUSH PRIVILEGES;
    SET SESSION sql_log_bin = 1;
    "

    # Realizar backup del master (solo base de datos de la app)
    echo "Realizando backup del master (solo gestion_personal)..."
    mysqldump -h mysql-master -u root -p$MYSQL_ROOT_PASSWORD \
        --single-transaction \
        --routines \
        --triggers \
        --databases gestion_personal > /tmp/backup.sql
    
    # Restaurar en la réplica
    echo "Restaurando backup en la réplica..."
    mysql -u root -p$MYSQL_ROOT_PASSWORD < /tmp/backup.sql
    
    # Configurar replicación
    echo "Configurando replicación..."
    mysql -u root -p$MYSQL_ROOT_PASSWORD -e "
    STOP SLAVE; RESET SLAVE ALL;
    CHANGE MASTER TO
      MASTER_HOST='mysql-master',
      MASTER_USER='replicador',
      MASTER_PASSWORD='replica_password',
      MASTER_USE_GTID=current_pos;
    START SLAVE;
    "

    # Verificar estado
    echo "Verificando estado de la replicación..."
    sleep 5
    mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW SLAVE STATUS\G" | grep -E "Slave_IO_Running|Slave_SQL_Running|Last_Error"
    
    echo "=== Réplica configurada exitosamente ==="
}

# Esperar a que MySQL de la réplica esté listo
echo "Esperando a que MySQL réplica esté listo..."
while ! mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SELECT 1" > /dev/null 2>&1; do
    echo "MySQL réplica aún no está listo, esperando..."
    sleep 5
done

echo "MySQL réplica está listo"

# Configurar replicación
configure_replication

# Mantener el contenedor vivo y monitorear
echo "Iniciando monitoreo de replicación..."
while true; do
    # Verificar estado cada 30 segundos
    if ! mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW SLAVE STATUS\G" | grep -q "Slave_IO_Running: Yes"; then
        echo "ADVERTENCIA: Réplica no está corriendo, reintentando configuración..."
        configure_replication
    fi
    sleep 30
done