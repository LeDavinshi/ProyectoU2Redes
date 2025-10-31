Base de datos principal
deberá tener las siguientes tablas:

Usuarios(id,rut,email,contraseña,perfil,activo,fechacreado,ultimoacceso);
PermisosDePerfil(id,perfil,modulo,permiso)

funcionarios(id,usuario_id,nombres,appellidopat,apellidomat,fechanac,genero,direccion,telefono,fechaingreso,activo)
contactosfuncionario(id,idfuncionario,tipocontacto,nombrecontacto,telefono,parentesco)

cargoscarrera(id,nombrecargo,grado,nivel,activo)
historialcargos(id,funcionarioid,cargoid,fechainicio,fechatermino,activo)
bienios(id,funcionarioid,fechainicio,fechatermino,cumplido,fechacumplimiento)
PD:los bienios son incrementos de sueldo correspondiente a cada 2 años de servicio

estudios(id,funcionarioid,tipoestudio,institucion,nombreestudio,fechainicio,fechatermino,fechatitulacion,docpdf)
capacitaciones(id,funcionarioid,nombrecurso,institucion,fechainicio,fechatermino,horas,puntaje,docpdf,estado)

calificaciones(id,funcionarioid,periodoevaluacion,puntaje,evaluador,fechaevaluacion,observaciones)
anotaciones(id,funcionarioid,tipoanotacion,descripcion,fechaanotacion,docreferencia)
sumarios(id,funcionarioid,numerosumario,descripcion,fechainicio,fechatermino,resultado,estado)

permisosadministrativos(id,funcionarioid,tipopermiso,fechasolicitud,fechainicio,fechatermino,motivo,estado)
permisoscompensatorios(id,funcionarioid,fechasolicitud,fechapermiso,horas,motivo,estado)
cometidos(id,funcionarioid,destino,fechasolicitud,fechainicio,fechatermino,objetivo,estado)

documentos(id,funcionarioid,tipodocumento,nombredocumento,rutarachivo,fechacarga,descripcion)
formatoscertificados(id,nombreformato,codigo,contenidotemplate,activo)