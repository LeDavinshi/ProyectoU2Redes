USE gestion_personal;

-- Insertar usuario funcionario
INSERT INTO Usuarios (rut, email, contrasena, perfil, activo)
VALUES (
    '22222222-2',
    'funcionario@empresa.cl',
    -- La contraseña es 'funcionario123'
    '$2b$10$mloQFXsa83OsAjLRoT8Q5uY5Mum6N9CU414PRUVpDZH6v58PhF5K2',
    'Funcionario',
    1
);

SET @usuario_id = LAST_INSERT_ID();

-- Insertar datos personales del funcionario
INSERT INTO Funcionarios (
    usuario_id,
    nombres,
    apellidopat,
    apellidomat,
    fechanac,
    genero,
    direccion,
    telefono,
    fechaingreso,
    activo
)
VALUES (
    @usuario_id,
    'María',
    'González',
    'López',
    '1995-06-15',
    'F',
    'Av. Principal 456',
    '+56987654321',
    '2024-01-01',
    1
);