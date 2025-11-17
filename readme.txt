

Integrantes: Jorge Rojas y Juan Madariaga


Licitacion: https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=mLvn8cKc3Jr6Hjeim+0Kow==

Se desarrollo un sistema de gestion de personal, el cual permite gestionar los datos de los funcionarios, los cuales pueden ser administradores o funcionarios, junto con la carga de documentacion
ya sea de estudios, capacitaciones, anotaciones, cometidos, sumarios, bienios, ascensos, decretos, calificaciones y certificados.

El sistema cuenta con un gateway que permite acceder a los microservicios, los cuales son:
- Auth: Autenticacion de usuarios
- Core: Gestion de datos
- Documentacion: Gestion de documentos
- Registros: Gestion de registros

El sistema cuenta con un frontend para administradores y funcionarios ambos con un balanceador de carga para cada uno.

El sistema cuenta con un docker-compose.yml que permite levantar todos los microservicios y el gateway.

Se desarrolo en react para el frontend y nodejs para los microservicios, la base de datos se encuentra en mariadb.

como ejecutar:
- docker-compose build
    - para construir los servicios
- docker-compose up -d
    - para levantar todos los servicios
- docker-compose down
    - para bajar todos los servicios
- docker-compose ps
    - para ver los servicios
- docker-compose logs
    - para ver los logs de los servicios

Rutas de acceso: 
- Frontend Admin: http://localhost:80
- Frontend Funcionario: http://localhost:81
- Gateway: http://localhost:80
- Auth: http://localhost:4000
- Core: http://localhost:4200
- Documentacion: http://localhost:4300
- Registros: http://localhost:4400

Contraseñas:
- Admin: 
    user: 12345678-9
    contraseña: password
- Funcionario:
    user: 11111111-1
    contraseña: password

