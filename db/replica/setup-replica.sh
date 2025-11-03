#!/bin/bash
# Script que configura automáticamente la réplica

set -e

echo "=== Iniciando configuración automática de réplica ==="

# Función para configurar la replicación
configure_replication() {
    echo "Configurando replicación..."
    
    # Esperar a que el master esté listo
    echo "Esperando a que el master esté disponible..."
    while ! mysql -h mysql-master -u root -prootpassword -e "SELECT 1" > /dev/null 2>&1; do
        echo "Master no disponible, esperando..."
        sleep 10
    done
    
    echo "Master disponible, procediendo con la configuración..."
    
    # Realizar backup del master
    echo "Realizando backup del master..."
    mysqldump -h mysql-master -u root -prootpassword \
        --single-transaction \
        --routines \
        --triggers \
        --all-databases > /tmp/backup.sql
    
    # Restaurar en la réplica
    echo "Restaurando backup en la réplica..."
    mysql -u root -prootpassword < /tmp/backup.sql
    
    # Configurar replicación
    echo "Configurando replicación..."
    mysql -u root -prootpassword -e "
    RESET SLAVE;
    CHANGE MASTER TO
    MASTER_HOST='mysql-master',
    MASTER_USER='replicador',
    MASTER_PASSWORD='replica_password',
    MASTER_AUTO_POSITION=1;
    START SLAVE;
    "
    
    # Verificar estado
    echo "Verificando estado de la replicación..."
    sleep 5
    mysql -u root -prootpassword -e "SHOW SLAVE STATUS\G" | grep -E "Slave_IO_Running|Slave_SQL_Running|Last_Error"
    
    echo "=== Réplica configurada exitosamente ==="
}

# Esperar a que MySQL de la réplica esté listo
echo "Esperando a que MySQL réplica esté listo..."
while ! mysql -u root -prootpassword -e "SELECT 1" > /dev/null 2>&1; do
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
    if ! mysql -u root -prootpassword -e "SHOW SLAVE STATUS\G" | grep -q "Slave_IO_Running: Yes"; then
        echo "ADVERTENCIA: Réplica no está corriendo, reintentando configuración..."
        configure_replication
    fi
    sleep 30
done