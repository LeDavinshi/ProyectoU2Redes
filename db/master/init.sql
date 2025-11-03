-- scripts/01-init.sql
CREATE DATABASE IF NOT EXISTS gestion_personal;
USE gestion_personal;

-- Crear usuario para replicación
CREATE USER 'replicador'@'%' IDENTIFIED BY 'replica_password';
GRANT REPLICATION SLAVE ON *.* TO 'replicador'@'%';
FLUSH PRIVILEGES;

-- Tabla de Usuarios
CREATE TABLE Usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rut VARCHAR(12) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    perfil VARCHAR(50) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fechacreado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimoacceso TIMESTAMP NULL
);

-- Tabla de PermisosDePerfil
CREATE TABLE PermisosDePerfil (
    id INT AUTO_INCREMENT PRIMARY KEY,
    perfil VARCHAR(50) NOT NULL,
    modulo VARCHAR(50) NOT NULL,
    permiso VARCHAR(50) NOT NULL,
    UNIQUE KEY unique_perfil_modulo_permiso (perfil, modulo, permiso)
);

-- Tabla de Funcionarios
CREATE TABLE Funcionarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidopat VARCHAR(50) NOT NULL,
    apellidomat VARCHAR(50) NOT NULL,
    fechanac DATE NOT NULL,
    genero ENUM('M', 'F', 'Otro') NOT NULL,
    direccion TEXT,
    telefono VARCHAR(20),
    fechaingreso DATE NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id),
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_activo (activo)
);

-- Tabla de ContactosFuncionario
CREATE TABLE ContactosFuncionario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idfuncionario INT NOT NULL,
    tipocontacto ENUM('Emergencia', 'Familiar', 'Personal') NOT NULL,
    nombrecontacto VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    parentesco VARCHAR(50),
    FOREIGN KEY (idfuncionario) REFERENCES Funcionarios(id),
    INDEX idx_funcionario (idfuncionario)
);

-- Tabla de CargosCarrera
CREATE TABLE CargosCarrera (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombrecargo VARCHAR(100) NOT NULL,
    grado INT NOT NULL,
    nivel INT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    INDEX idx_activo (activo)
);

-- Tabla de HistorialCargos
CREATE TABLE HistorialCargos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    funcionarioid INT NOT NULL,
    cargoid INT NOT NULL,
    fechainicio DATE NOT NULL,
    fechatermino DATE NULL,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (funcionarioid) REFERENCES Funcionarios(id),
    FOREIGN KEY (cargoid) REFERENCES CargosCarrera(id),
    INDEX idx_funcionario (funcionarioid),
    INDEX idx_activo (activo)
);

-- Tabla de Bienios (incrementos de sueldo cada 2 anos)
CREATE TABLE Bienios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    funcionarioid INT NOT NULL,
    fechainicio DATE NOT NULL,
    fechatermino DATE NOT NULL,
    cumplido BOOLEAN DEFAULT FALSE,
    fechacumplimiento DATE NULL,
    FOREIGN KEY (funcionarioid) REFERENCES Funcionarios(id),
    INDEX idx_funcionario (funcionarioid),
    INDEX idx_cumplido (cumplido)
);

-- Tabla de Estudios
CREATE TABLE Estudios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    funcionarioid INT NOT NULL,
    tipoestudio ENUM('Basica', 'Media', 'Tecnico', 'Profesional', 'Postgrado', 'Magister', 'Doctorado') NOT NULL,
    institucion VARCHAR(100) NOT NULL,
    nombreestudio VARCHAR(150) NOT NULL,
    fechainicio DATE NOT NULL,
    fechatermino DATE NULL,
    fechatitulacion DATE NULL,
    docpdf VARCHAR(255),
    FOREIGN KEY (funcionarioid) REFERENCES Funcionarios(id),
    INDEX idx_funcionario (funcionarioid)
);

-- Tabla de Capacitaciones
CREATE TABLE Capacitaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    funcionarioid INT NOT NULL,
    nombrecurso VARCHAR(150) NOT NULL,
    institucion VARCHAR(100) NOT NULL,
    fechainicio DATE NOT NULL,
    fechatermino DATE NOT NULL,
    horas INT NOT NULL,
    puntaje DECIMAL(5,2),
    docpdf VARCHAR(255),
    estado ENUM('Planificado', 'En Curso', 'Completado', 'Cancelado') DEFAULT 'Planificado',
    FOREIGN KEY (funcionarioid) REFERENCES Funcionarios(id),
    INDEX idx_funcionario (funcionarioid),
    INDEX idx_estado (estado)
);

-- Tabla de Calificaciones
CREATE TABLE Calificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    funcionarioid INT NOT NULL,
    periodoevaluacion VARCHAR(50) NOT NULL,
    puntaje DECIMAL(5,2) NOT NULL,
    evaluador VARCHAR(100) NOT NULL,
    fechaevaluacion DATE NOT NULL,
    observaciones TEXT,
    FOREIGN KEY (funcionarioid) REFERENCES Funcionarios(id),
    INDEX idx_funcionario (funcionarioid),
    INDEX idx_periodo (periodoevaluacion)
);

-- Tabla de Anotaciones
CREATE TABLE Anotaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    funcionarioid INT NOT NULL,
    tipoanotacion ENUM('Positiva', 'Negativa', 'Neutra') NOT NULL,
    descripcion TEXT NOT NULL,
    fechaanotacion DATE NOT NULL,
    docreferencia VARCHAR(255),
    FOREIGN KEY (funcionarioid) REFERENCES Funcionarios(id),
    INDEX idx_funcionario (funcionarioid),
    INDEX idx_tipo (tipoanotacion)
);

-- Tabla de Sumarios
CREATE TABLE Sumarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    funcionarioid INT NOT NULL,
    numerosumario VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT NOT NULL,
    fechainicio DATE NOT NULL,
    fechatermino DATE NULL,
    resultado TEXT,
    estado ENUM('Iniciado', 'En Investigacion', 'Cerrado', 'Archivado') DEFAULT 'Iniciado',
    FOREIGN KEY (funcionarioid) REFERENCES Funcionarios(id),
    INDEX idx_funcionario (funcionarioid),
    INDEX idx_estado (estado)
);

-- Tabla de PermisosAdministrativos
CREATE TABLE PermisosAdministrativos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    funcionarioid INT NOT NULL,
    tipopermiso ENUM('Vacaciones', 'Licencia Medica', 'Permiso Personal', 'Otro') NOT NULL,
    fechasolicitud DATE NOT NULL,
    fechainicio DATE NOT NULL,
    fechatermino DATE NOT NULL,
    motivo TEXT NOT NULL,
    estado ENUM('Solicitado', 'Aprobado', 'Rechazado', 'Utilizado') DEFAULT 'Solicitado',
    FOREIGN KEY (funcionarioid) REFERENCES Funcionarios(id),
    INDEX idx_funcionario (funcionarioid),
    INDEX idx_estado (estado)
);

-- Tabla de PermisosCompensatorios
CREATE TABLE PermisosCompensatorios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    funcionarioid INT NOT NULL,
    fechasolicitud DATE NOT NULL,
    fechapermiso DATE NOT NULL,
    horas INT NOT NULL,
    motivo TEXT NOT NULL,
    estado ENUM('Solicitado', 'Aprobado', 'Rechazado', 'Utilizado') DEFAULT 'Solicitado',
    FOREIGN KEY (funcionarioid) REFERENCES Funcionarios(id),
    INDEX idx_funcionario (funcionarioid),
    INDEX idx_estado (estado)
);

-- Tabla de Cometidos
CREATE TABLE Cometidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    funcionarioid INT NOT NULL,
    destino VARCHAR(100) NOT NULL,
    fechasolicitud DATE NOT NULL,
    fechainicio DATE NOT NULL,
    fechatermino DATE NOT NULL,
    objetivo TEXT NOT NULL,
    estado ENUM('Solicitado', 'Aprobado', 'Rechazado', 'Completado') DEFAULT 'Solicitado',
    FOREIGN KEY (funcionarioid) REFERENCES Funcionarios(id),
    INDEX idx_funcionario (funcionarioid),
    INDEX idx_estado (estado)
);

-- Tabla de Documentos
CREATE TABLE Documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    funcionarioid INT NOT NULL,
    tipodocumento VARCHAR(50) NOT NULL,
    nombredocumento VARCHAR(150) NOT NULL,
    rutarachivo VARCHAR(255) NOT NULL,
    fechacarga TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    descripcion TEXT,
    FOREIGN KEY (funcionarioid) REFERENCES Funcionarios(id),
    INDEX idx_funcionario (funcionarioid),
    INDEX idx_tipo (tipodocumento)
);

-- Tabla de FormatosCertificados
CREATE TABLE FormatosCertificados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombreformato VARCHAR(100) NOT NULL,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    contenidotemplate TEXT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    INDEX idx_activo (activo)
);

-- Insertar datos iniciales de ejemplo
INSERT IGNORE INTO Usuarios (rut, email, contrasena, perfil, activo) VALUES 
('12345678-9', 'admin@empresa.cl', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrador', TRUE),
('98765432-1', 'jefe@empresa.cl', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jefe', TRUE);

INSERT IGNORE INTO PermisosDePerfil (perfil, modulo, permiso) VALUES 
('Administrador', 'usuarios', 'crear'),
('Administrador', 'usuarios', 'editar'),
('Administrador', 'usuarios', 'eliminar'),
('Jefe', 'usuarios', 'ver'),
('Jefe', 'reportes', 'generar');

INSERT IGNORE INTO CargosCarrera (nombrecargo, grado, nivel, activo) VALUES 
('Analista', 10, 1, TRUE),
('Profesional', 12, 2, TRUE),
('Jefe de Departamento', 14, 3, TRUE);