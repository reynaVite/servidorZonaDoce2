const express = require('express');
const helmet = require('helmet');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' },{ storage: multer.memoryStorage() });

const path = require('path'); 

   
const fs = require('fs');
const util = require('util'); 


const bcrypt = require('bcrypt');
const cors = require('cors');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const uuid = require('uuid');
//const { Typography } = require('antd');
//const { Paragraph } = Typography;
const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(helmet());
const moment = require('moment'); 



const PORT = process.env.PORT || 3000;


const pool = mysql.createPool({
  host: '162.241.62.202',
  user: 'eduzonac_adminZona',
  password: '.51?^^7mU6$1',
  database: 'eduzonac_012zona',
  waitForConnections: true,
  connectionLimit: 100,
  queueLimit: 0
});

app.use((req, res, next) => {
  req.mysqlPool = pool;
  next();
});

app.get('/', async (req, res) => {
  try {
    const connection = await req.mysqlPool.getConnection();
    console.log('Conexión exitosa a la base de datos');
    connection.release();
    res.send('Conexión exitosa a la base de datos');
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error);
    res.status(500).send('Error al conectar a la base de datos');
  }
});


const enviarTokenYCorreo = async (correo, nombre, token) => {
  const config = {
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: 'zona012huazalingo@gmail.com',
      pass: 'kkcw ofwd qeon cpvr'
    },
    tls: {
      rejectUnauthorized: false // Ignora la verificación del certificado
    }
  };
  const mensaje = {
    from: 'EduZona012 <zona012huazalingo@gmail.com>',
    to: correo,
    subject: 'Código de recuperación de contraseña - EduZona012',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #00314A; padding: 20px;">
      <img src="https://eduzona.com.mx/logo.png" alt="EduZona012 Logo" style="max-width: 100px; max-height: 100px;">
    </div>
        <div style="background-color: #fff; padding: 20px;">
          <h3 style="margin-bottom: 20px;">Hola ${nombre},</h3>
          <p>Has solicitado restablecer tu contraseña en EduZona012. El código de recuperación que se proporciona tiene una duración de 10 minutos:</p>
          <div style="display: flex; align-items: center; margin-bottom: 20px;">
            <strong style="flex: 1;">${token}</strong>
          </div>
          <p>Por favor, úsalo dentro de los próximos 10 minutos para restablecer tu contraseña.</p>
          <p>Si no has solicitado esta recuperación de contraseña, por favor ignora este mensaje.</p>
        </div>
        <div style="background-color: #00314A; padding: 20px; text-align: center;">
          <p style="margin-bottom: 0; color: #fff;">© 2024 EduZona012. Todos los derechos reservados.</p>
        </div>
      </div>
    `
  };
  const transport = nodemailer.createTransport(config);
  try {
    const info = await transport.sendMail(mensaje);
    console.log('Correo electrónico enviado:', info);
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    throw error;
  }
};

//YAAA
app.post('/generar-token-y-enviar-correo', async (req, res) => {
  const { curp } = req.body;
  let connection;
  try {
    const token = uuid.v4(); // Generar un token único utilizando UUID
    console.log('Token generado:', token);
    connection = await req.mysqlPool.getConnection();
    const emailQuery = `SELECT correo, nombre FROM registro WHERE curp = ?`; // Obtener el correo asociado a la CURP desde la base de datos
    const [rows] = await connection.query(emailQuery, [curp]);
    const { correo, nombre } = rows[0];
    const updateTokenQuery = `UPDATE registro SET token = ?, fecha_envio = NOW() WHERE curp = ?`;
    await connection.query(updateTokenQuery, [token, curp]);
    await enviarTokenYCorreo(correo, nombre, token);
    console.log('Token generado y enviado por correo');
    // Programar la eliminación del token después de 10 minutos
    setTimeout(async () => {
      try {
        const deleteTokenQuery = `UPDATE registro SET token = NULL WHERE curp = ?`;
        await req.mysqlPool.query(deleteTokenQuery, [curp]);
        console.log('Token eliminado después de 10 minutos');
      } catch (error) {
        console.error('Error al eliminar el token después de 10 minutos:', error);
      }
    }, 10 * 60 * 1000);
    res.json({ token });
  } catch (error) {
    console.error('Error al generar y enviar el token:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAAA
app.get('/registrosB', async (req, res) => {
  let connection;
  try {
    const query = `
      SELECT registro.*, 
             plantel.nombre AS nombre_plantel, 
             sesion.tipo_sesion AS tipo_sesion, 
             estado_cuenta.estado_cuenta AS estado_cuenta, 
             estado_usuario.estado_usuario AS estado_usuario
      FROM registro
      JOIN plantel ON registro.plantel = plantel.id
      JOIN sesion ON registro.sesion = sesion.id
      JOIN estado_cuenta ON registro.estado_cuenta = estado_cuenta.id
      JOIN estado_usuario ON registro.estado_usuario = estado_usuario.id;
    `;
    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query);
    res.json(results);
  } catch (error) {
    console.error('Error al obtener registros:', error);
    res.status(500).json({ error: 'Error al obtener registros' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAA
app.get('/registroSol', async (req, res) => {
  let connection;
  try {
    const query = `
      SELECT 
        r.curp, 
        p.nombre AS plantel, 
        s.tipo_sesion AS sesion, 
        r.nombre, 
        r.aPaterno, 
        r.aMaterno, 
        r.correo, 
        r.fecha_solicitud
      FROM 
        registrosoli r
        INNER JOIN plantel p ON r.plantel = p.id
        INNER JOIN sesion s ON r.sesion = s.id
    `;
    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query);
    res.json(results);
  } catch (error) {
    console.error('Error al obtener registros:', error);
    res.status(500).json({ error: 'Error al obtener registros' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


const enviarMailSolCan = async (correo, nombre) => {
  const config = {
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: 'zona012huazalingo@gmail.com',
      pass: 'kkcw ofwd qeon cpvr'
    },
    tls: {
      rejectUnauthorized: false // Ignora la verificación del certificado
    }
  };
  const mensaje = {
    from: 'EduZona012 <zona012huazalingo@gmail.com>',
    to: correo,
    subject: 'Solicitud de registro rechazada - EduZona012',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #00314A; padding: 20px;">
          <img src="https://eduzona.com.mx/logo.png" alt="EduZona012 Logo" style="max-width: 100px; max-height: 100px;">
        </div>
        <div style="background-color: #fff; padding: 20px;">
          <h3 style="margin-bottom: 20px;">Hola ${nombre},</h3>
          <p>Lamentamos informarte que tu solicitud de registro en EduZona012 ha sido rechazada.</p>
          <p>Gracias por tu interés en nuestra plataforma.</p>
        </div>
        <div style="background-color: #00314A; padding: 20px; text-align: center;">
          <p style="margin-bottom: 0; color: #fff;">© 2024 EduZona012. Todos los derechos reservados.</p>
        </div>
      </div>
    `
  };
  const transport = nodemailer.createTransport(config);
  try {
    const info = await transport.sendMail(mensaje);
    console.log('Correo electrónico enviado:', info);
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    throw error;
  }
};

//YAA
app.get('/registroSolCan', async (req, res) => {
  let connection;
  try {
    const curp = req.query.curp;
    const ipAddress = req.ip.includes('::1') ? '127.0.0.1' : req.ip.replace(/^.*:/, '');
    console.log('Datos de inicio de sesión recibidos en el backend:', { curp, ipAddress });

    const query = `
      SELECT curp, nombre, correo
      FROM registrosoli
      WHERE curp = ?
    `;

    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query, [curp]);

    if (results.length === 0) {
      return res.status(404).json({ error: 'No se encontraron registros para la CURP proporcionada' });
    }

    const { nombre, correo } = results[0];
    await enviarMailSolCan(correo, nombre);

    await connection.execute(`
      DELETE FROM registrosoli
      WHERE curp = ?
    `, [curp]);

    const insertQuery = 'INSERT INTO logs_CanUser (IP, fecha_hora, curp, descripcion) VALUES (?, NOW(), ?, ?)';
    await connection.execute(insertQuery, [ipAddress, curp, 'No se concedió acceso al sistema a un usuario']);

    res.json({ message: 'Correo electrónico enviado y registro eliminado exitosamente' });
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


const enviarMailSol = async (correo, nombre) => {
  const config = {
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: 'zona012huazalingo@gmail.com',
      pass: 'kkcw ofwd qeon cpvr'
    },
    tls: {
      rejectUnauthorized: false
    }
  };
  const mensaje = {
    from: 'EduZona012 <zona012huazalingo@gmail.com>',
    to: correo,
    subject: 'Solicitud de registro aceptada - EduZona012',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #00314A; padding: 20px;">
          <img src="https://eduzona.com.mx/logo.png" alt="EduZona012 Logo" style="max-width: 100px; max-height: 100px;">
        </div>
      
        <div style="background-color: #fff; padding: 20px;">
          <h3 style="margin-bottom: 20px;">Hola ${nombre},</h3>
          <p>Nos complace informarte que tu solicitud de registro en EduZona012 ha sido aceptada.</p>
          <p>¡Bienvenido a nuestra plataforma!</p>
        </div>
        <div style="background-color: #00314A; padding: 20px; text-align: center;">
          <p style="margin-bottom: 0; color: #fff;">© 2024 EduZona012. Todos los derechos reservados.</p>
        </div>
      </div>
    `
  };
  const transport = nodemailer.createTransport(config);
  const info = await transport.sendMail(mensaje);
  console.log(info);
};

//YAAAAAAAA
app.get('/registroSolAcep', async (req, res) => {
  let connection;
  try {
    const curp = req.query.curp;
    const ipAddress = req.ip.includes('::1') ? '127.0.0.1' : req.ip.replace(/^.*:/, '');
    console.log('Datos de inicio de sesión recibidos en el backend:', { curp, ipAddress });

    const query = `
      SELECT curp, plantel, sesion, nombre, aPaterno, aMaterno, correo, clave
      FROM registrosoli
      WHERE curp = ?
    `;

    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query, [curp]);

    const insertQuery = 'INSERT INTO logs_AcepUser (IP, fecha_hora, curp, descripcion) VALUES (?, NOW(), ?, ?)';
    await connection.execute(insertQuery, [ipAddress, curp, 'Se concedió acceso a un usuario en el sistema']);

    if (results.length === 0) {
      return res.status(404).json({ error: 'No se encontraron registros para la CURP proporcionada' });
    }

    const correo = results[0].correo;
    const nombre = results[0].nombre;

    try {
      await enviarMailSol(correo, nombre);
    } catch (mailError) {
      console.error('Error al enviar el correo:', mailError);
    }

    const result = results[0];

    await connection.execute(`
      INSERT INTO registro (curp, plantel, sesion, nombre, aPaterno, aMaterno, correo, clave)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      result.curp,
      result.plantel,
      result.sesion,
      result.nombre,
      result.aPaterno,
      result.aMaterno,
      result.correo,
      result.clave
    ]);

    await connection.execute(`DELETE FROM registrosoli WHERE curp = ?`, [curp]); // Eliminar el registro en registrosoli relacionado con la CURP

    res.json(result);
  } catch (error) {
    console.error('Error al obtener registros:', error);
    res.status(500).json({ error: 'Error al obtener registros' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


const enviarMailBaja = async (correo, nombre) => {
  const config = {
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: 'zona012huazalingo@gmail.com',
      pass: 'kkcw ofwd qeon cpvr'
    },
    tls: {
      rejectUnauthorized: false
    }
  };
  const mensaje = {
    from: 'EduZona012 <zona012huazalingo@gmail.com>',
    to: correo,
    subject: 'Aviso de baja del sistema EduZona012',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #00314A; padding: 20px;">
          <img src="https://eduzona.com.mx/logo.png" alt="EduZona012 Logo" style="max-width: 100px; max-height: 100px;">
        </div>
        
        <div style="background-color: #fff; padding: 20px;">
          <h3 style="margin-bottom: 20px;">Estimad@ ${nombre},</h3>
          <p>Le informamos que su cuenta en el sistema EduZona012 ha sido dada de baja.</p>
          <p>Si considera que esto es un error, por favor, consulte con su superior.</p>
        </div>
        <div style="background-color: #00314A; padding: 20px; text-align: center;">
          <p style="margin-bottom: 0; color: #fff;">© 2024 EduZona012. Todos los derechos reservados.</p>
        </div>
      </div>
    `
  };
  const transport = nodemailer.createTransport(config);
  const info = await transport.sendMail(mensaje);
  console.log(info);
};

//YAAA
app.get('/registroBaja', async (req, res) => {
  let connection;
  try {
    const curp = req.query.curp;
    const ipAddress = req.ip.includes('::1') ? '127.0.0.1' : req.ip.replace(/^.*:/, '');
    console.log('Datos de baja  backend:', { curp, ipAddress });

    connection = await req.mysqlPool.getConnection();

    await connection.execute(`
      UPDATE registro
      SET estado_cuenta = 2, estado_usuario = 2
      WHERE curp = ?
    `, [curp]); // Actualizar los campos estado_cuenta y estado_usuario a 2

    const [result] = await connection.execute(`
      SELECT correo, nombre FROM registro WHERE curp = ?
    `, [curp]); // Obtener el correo del registro

    if (result.length === 0) {
      return res.status(404).json({ error: 'No se encontraron registros para la CURP proporcionada' });
    }

    const insertQuery = 'INSERT INTO logs_BajaUser (IP, fecha_hora, curp, descripcion) VALUES (?, NOW(), ?, ?)';
    await connection.execute(insertQuery, [ipAddress, curp, 'Se eliminó el acceso de un usuario del sistema']);

    const { correo, nombre } = result[0];

    try {
      await enviarMailBaja(correo, nombre);
    } catch (mailError) {
      console.error('Error al enviar el correo:', mailError);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error al obtener registros:', error);
    res.status(500).json({ error: 'Error al obtener registros' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});



const enviarMailActivar = async (correo, nombre) => {
  const config = {
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: 'zona012huazalingo@gmail.com',
      pass: 'kkcw ofwd qeon cpvr'
    },
    tls: {
      rejectUnauthorized: false
    }
  };
  const mensaje = {
    from: 'EduZona012 <zona012huazalingo@gmail.com>',
    to: correo,
    subject: 'Cuenta reactivada en el sistema EduZona012',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #00314A; padding: 20px;">
          <img src="https://eduzona.com.mx/logo.png" alt="EduZona012 Logo" style="max-width: 100px; max-height: 100px;">
        </div>
        
        <div style="background-color: #fff; padding: 20px;">
          <h3 style="margin-bottom: 20px;">Estimad@ ${nombre},</h3>
          <p>Le informamos que su cuenta en el sistema EduZona012 ha sido reactivada.</p>
          <p>Ahora puede iniciar sesión nuevamente con sus credenciales.</p>
        </div>
        <div style="background-color: #00314A; padding: 20px; text-align: center;">
          <p style="margin-bottom: 0; color: #fff;">© 2024 EduZona012. Todos los derechos reservados.</p>
        </div>
      </div>
    `
  };
  const transport = nodemailer.createTransport(config);
  const info = await transport.sendMail(mensaje);
  console.log(info);
};

//YAAAA
app.get('/registroActivar', async (req, res) => {
  let connection;
  try {
    const curp = req.query.curp;
    const ipAddress = req.ip.includes('::1') ? '127.0.0.1' : req.ip.replace(/^.*:/, '');
    console.log('Datos de inicio de sesión recibidos en el backend:', { curp, ipAddress });

    connection = await req.mysqlPool.getConnection();

    await connection.execute(`
      UPDATE registro
      SET estado_cuenta = 1, estado_usuario = 1
      WHERE curp = ?
    `, [curp]); // Actualizar los campos estado_cuenta y estado_usuario a 2

    const [result] = await connection.execute(`
      SELECT correo, nombre
      FROM registro
      WHERE curp = ?
    `, [curp]); // Obtener el correo del registro

    if (result.length === 0) {
      return res.status(404).json({ error: 'No se encontraron registros para la CURP proporcionada' });
    }

    const insertQuery = 'INSERT INTO logs_BajaUser (IP, fecha_hora, curp, descripcion) VALUES (?, NOW(), ?, ?)';
    await connection.execute(insertQuery, [ipAddress, curp, 'Se reactivó el acceso de un usuario del sistema']);

    const { correo, nombre } = result[0];

    try {
      await enviarMailActivar(correo, nombre);
    } catch (mailError) {
      console.error('Error al enviar el correo:', mailError);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error al obtener registros:', error);
    res.status(500).json({ error: 'Error al obtener registros' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAAAA
app.post('/insertar-datossss', async (req, res) => {
  let connection;
  try {
    const { dato } = req.body;
    connection = await req.mysqlPool.getConnection();
    await connection.query('INSERT INTO yo (dato) VALUES (?)', [dato]);
    res.status(200).send('Dato insertado correctamente en la base de datos');
  } catch (error) {
    console.error('Error al insertar dato en la base de datos:', error);
    res.status(500).send('Error al insertar dato en la base de datos');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAAA
app.get('/plantel', async (req, res) => {
  let connection;
  try {
    const query = 'SELECT id, nombre FROM plantel';
    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query);
    const options = results.map(result => ({
      value: result.id,
      label: result.nombre
    }));
    res.json(options);
  } catch (error) {
    console.error('Error al obtener datos del plantel:', error);
    res.status(500).json({ error: 'Error al obtener datos del plantel' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAA
app.get('/sesiones', async (req, res) => {
  let connection;
  try {
    const query = 'SELECT id, tipo_sesion FROM sesion';
    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query);
    const options = results.map(result => ({
      value: result.id,
      label: result.tipo_sesion
    }));
    res.json(options);
  } catch (error) {
    console.error('Error al obtener datos de sesiones:', error);
    res.status(500).json({ error: 'Error al obtener datos de sesiones' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


//YAAA
app.get('/preguntas-secretas', async (req, res) => {
  let connection;
  try {
    const query = 'SELECT id, tipo_pregunta FROM pregunta';
    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query);
    const options = results.map(result => ({
      value: result.id,
      label: result.tipo_pregunta
    }));
    res.json(options);
  } catch (error) {
    console.error('Error al obtener datos de preguntas secretas:', error);
    res.status(500).json({ error: 'Error al obtener datos de preguntas secretas' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAAA
app.post('/verificar-correo', async (req, res) => {
  let connection;
  try {
    const { correo } = req.body;
    connection = await req.mysqlPool.getConnection();
    const query = 'SELECT COUNT(*) as count FROM registro WHERE correo = ?';
    const [results] = await connection.execute(query, [correo]);
    const exists = results[0].count > 0;
    res.json({ exists });
  } catch (error) {
    console.error('Error al verificar la existencia del correo en la base de datos:', error);
    res.status(500).json({ error: 'Error al verificar la existencia del correo en la base de datos' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAAAAAAAAAAAA
app.post('/verificar-correoSoli', async (req, res) => {
  let connection;
  try {
    const { correo } = req.body;
    connection = await req.mysqlPool.getConnection();
    const query = 'SELECT COUNT(*) as count FROM registrosoli WHERE correo = ?';
    const [results] = await connection.execute(query, [correo]);
    const exists = results[0].count > 0;
    res.json({ exists });
  } catch (error) {
    console.error('Error al verificar la existencia del correo en la base de datos:', error);
    res.status(500).json({ error: 'Error al verificar la existencia del correo en la base de datos' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAAA
app.post('/verificar-curpSoli', async (req, res) => {
  let connection;
  try {
    const { curp } = req.body;
    connection = await req.mysqlPool.getConnection();
    const query = 'SELECT COUNT(*) as count FROM registrosoli WHERE curp = ?';
    const [results] = await connection.execute(query, [curp]);
    const exists = results[0].count > 0;
    res.json({ exists });
  } catch (error) {
    console.error('Error al verificar la existencia de la CURP en la base de datos:', error);
    res.status(500).json({ error: 'Error al verificar la existencia de la CURP en la base de datos' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAAAAAAAAAAAA
app.post('/verificar-curp', async (req, res) => {
  let connection;
  try {
    const { curp } = req.body;
    connection = await req.mysqlPool.getConnection();
    const query = 'SELECT COUNT(*) as count, estado_usuario FROM registro WHERE curp = ?';
    const [results] = await connection.execute(query, [curp]);
    if (results.length > 0) {
      const exists = results[0].count > 0;
      const estadoUsuario = results[0].estado_usuario;
      if (estadoUsuario === 2) {
        res.json({ exists, usuarioDeBaja: true });
      } else {
        res.json({ exists, usuarioDeBaja: false });
      }
    } else {
      res.json({ exists: false, usuarioDeBaja: false });
    }
  } catch (error) {
    console.error('Error al verificar la existencia de la CURP en la base de datos:', error);
    res.status(500).json({ error: 'Error al verificar la existencia de la CURP en la base de datos' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YA
app.post('/verificar-curp-contra', async (req, res) => {
  let connection;
  try {
    const { curp } = req.body;
    connection = await req.mysqlPool.getConnection();
    const query = 'SELECT COUNT(*) as count, contrasena FROM registro WHERE curp = ?';
    const [results] = await connection.execute(query, [curp]);
    if (results.length === 0) {
      res.json({ exists: false, emptyPassword: false });
    } else {
      const exists = results[0].count > 0;
      const emptyPassword = results[0].contrasena ? false : true;
      res.json({ exists, emptyPassword });
    }
  } catch (error) {
    console.error('Error al verificar la existencia de la CURP en la base de datos:', error);
    res.status(500).json({ error: 'Error al verificar la existencia de la CURP en la base de datos' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


const enviarMailBloAdmin = async (curp, plantel, sesion, nombre, aPaterno, aMaterno, correo) => {
  const config = {
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: 'zona012huazalingo@gmail.com',
      pass: 'kkcw ofwd qeon cpvr'
    },
    tls: {
      rejectUnauthorized: false
    }
  };
  const mensajee = {
    from: 'zona012huazalingo@gmail.com',
    to: 'zona012huazalingo@gmail.com',
    subject: 'Usuario bloqueado en EduZona012',
    html: `
      <p>Usuario bloqueado debido a múltiples intentos fallidos de inicio de sesión:</p>
      <ul>
        <li>CURP: ${curp}</li>
        <li>Plantel: ${plantel}</li>
        <li>Sesión: ${sesion}</li>
        <li>Nombre: ${nombre} ${aPaterno} ${aMaterno}</li>
        <li>Correo: ${correo}</li>
      </ul>
    `
  };
  const transportt = nodemailer.createTransport(config);
  const infoo = await transportt.sendMail(mensajee);
  console.log(infoo);
};
const enviarMailBloClie = async (correo, nombre) => {
  const config = {
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: 'zona012huazalingo@gmail.com',
      pass: 'kkcw ofwd qeon cpvr'
    },
    tls: {
      rejectUnauthorized: false
    }
  };
  const mensaje = {
    from: 'EduZona012 <zona012huazalingo@gmail.com>',
    to: correo,
    subject: 'Cuenta bloqueada en EduZona012',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #00314A; padding: 20px;">
          <img src="https://eduzona.com.mx/logo.png" alt="EduZona012 Logo" style="max-width: 100px; max-height: 100px;">
        </div>
        <div style="background-color: #fff; padding: 20px;">
          <h3 style="margin-bottom: 20px;">Hola ${nombre},</h3>
          <p>Su cuenta en EduZona012 ha sido bloqueada debido a múltiples intentos fallidos de inicio de sesión.</p>
          <p>Para recuperar su cuenta, por favor diríjase a la página oficial y restablezca su contraseña.</p>
        </div>
        <div style="background-color: #00314A; padding: 20px; text-align: center;">
          <p style="margin-bottom: 0; color: #fff;">© 2024 EduZona012. Todos los derechos reservados.</p>
        </div>
      </div>
    `
  };
  const transport = nodemailer.createTransport(config);
  const info = await transport.sendMail(mensaje);
  console.log(info);
};

//YAAAAAAA
app.post('/updateEstadoCuenta', async (req, res) => {
  let connection;
  try {
    const { curp } = req.body;
    const ipAddress = req.ip.includes('::1') ? '127.0.0.1' : req.ip.replace(/^.*:/, ''); // Extraer la IP del cliente
    console.log('Datos de inicio de sesión recibidos en el backend:', { curp, ipAddress }); // Mostrar los datos en consola
    connection = await req.mysqlPool.getConnection();
    const usuarioQuery = `
      SELECT curp, plantel, sesion, nombre, aPaterno, aMaterno, correo
      FROM registro
      WHERE curp = ?
    `;
    const [usuarioResult] = await connection.execute(usuarioQuery, [curp]);
    if (usuarioResult.length > 0) {
      const { curp, plantel, sesion, nombre, aPaterno, aMaterno, correo } = usuarioResult[0];
      const updateQuery = `
        UPDATE registro
        SET estado_cuenta = 2
        WHERE curp = ?
      `;
      await connection.execute(updateQuery, [curp]);
      res.status(200).send('Actualización exitosa del estado de cuenta a 2');
      const insertQuery = 'INSERT INTO logs_bloqueoIni (IP, fecha_hora, curp) VALUES (?, NOW(), ?)';
      await connection.execute(insertQuery, [ipAddress, curp]);
      // Enviar correo al administrador con los datos extraídos
      await enviarMailBloAdmin(curp, plantel, sesion, nombre, aPaterno, aMaterno, correo);
      // Enviar correo al usuario bloqueado
      await enviarMailBloClie(correo, nombre);
    } else {
      res.status(404).send('No se encontró al usuario para la CURP especificada');
    }
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    res.status(500).send('Error al procesar la solicitud');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

const enviarMail = async (curp, plantel, sesion, nombre, aPaterno, aMaterno, correo) => {
  const config = {
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: 'zona012huazalingo@gmail.com',
      pass: 'kkcw ofwd qeon cpvr'
    },
    tls: {
      rejectUnauthorized: false
    }
  };

  let nombrePlantel;
  switch (plantel) {
    case 1:
      nombrePlantel = 'Zona 012';
      break;
    case 2:
      nombrePlantel = 'Benito Juárez';
      break;
    case 3:
      nombrePlantel = 'Héroe Agustín';
      break;
    default:
      nombrePlantel = 'No definido';
      break;
  }
  let nombreSesion;
  switch (sesion) {
    case 1:
      nombreSesion = 'Supervisor';
      break;
    case 2:
      nombreSesion = 'Director';
      break;
    case 3:
      nombreSesion = 'Maestro';
      break;
  }
  const mensaje = {
    from: 'EduZona012 <zona012huazalingo@gmail.com>',
    to: 'zona012huazalingo@gmail.com',
    subject: 'Solicitud de registro en EduZona012',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #00314A; padding: 20px;">
          <img src="https://eduzona.com.mx/logo.png" alt="EduZona012 Logo" style="max-width: 100px; max-height: 100px;">
        </div>
        <div style="background-color: #fff; padding: 20px;">
          <h3 style="margin-bottom: 20px;">Se ha recibido una nueva solicitud de registro que está pendiente de revisión:</h3>
          <ul>
            <li><strong>CURP:</strong> ${curp}</li>
            <li><strong>Plantel:</strong> ${nombrePlantel}</li>
            <li><strong>Sesión:</strong> ${nombreSesion}</li>
            <li><strong>Nombre:</strong> ${nombre}</li>
            <li><strong>Apellido paterno:</strong> ${aPaterno}</li>
            <li><strong>Apellido materno:</strong> ${aMaterno}</li>
            <li><strong>Correo:</strong> ${correo}</li>
          </ul>
          <p>Para aceptar o rechazar la solicitud, haz clic en el siguiente enlace:</p>
          <p><a href="https://edu-zona.vercel.app/">Enlace a la página de revisión de solicitudes</a></p>
        </div>
        <div style="background-color: #00314A; padding: 20px; text-align: center;">
          <p style="margin-bottom: 0; color: #fff;">© 2024 EduZona012. Todos los derechos reservados.</p>
        </div>
      </div>
    `
  };
  const transport = nodemailer.createTransport(config);
  const info = await transport.sendMail(mensaje);
  console.log(info);
}
//YAAA
app.post('/insertar-solicitud', async (req, res) => {
  let connection;
  try {
    const {
      curp,
      plantel,
      sesion,
      nombre,
      aPaterno,
      aMaterno,
      correo
    } = req.body;
    const clave = uuid.v4();
    connection = await req.mysqlPool.getConnection();
    const query = `
      INSERT INTO registrosoli 
        (curp, plantel, sesion, nombre, aPaterno, aMaterno, correo, clave)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await connection.execute(query, [curp, plantel, sesion, nombre, aPaterno, aMaterno, correo, clave]);
    res.status(200).send('Registro exitoso');
    await enviarMail(curp, plantel, sesion, nombre, aPaterno, aMaterno, correo);
  } catch (error) {
    console.error('Error al insertar dato en la base de datos:', error);
    res.status(500).send('Error al insertar dato en la base de datos');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAAA
app.post('/insertar-dato', async (req, res) => {
  let connection;
  try {
    const {
      curp,
      plantel,
      sesion,
      nombre,
      aPaterno,
      aMaterno,
      correo,
      pregunta,
      respuesta,
      contrasena
    } = req.body;
    connection = await req.mysqlPool.getConnection();
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contrasena, saltRounds);
    const hashedRespuesta = await bcrypt.hash(respuesta, saltRounds);
    const query = `
      INSERT INTO registro 
        (curp, plantel, sesion, nombre, aPaterno, aMaterno, correo, pregunta, respuesta, contrasena)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await connection.execute(query, [curp, plantel, sesion, nombre, aPaterno, aMaterno, correo, pregunta, hashedRespuesta, hashedPassword]);
    res.status(200).send('Registro exitoso');
  } catch (error) {
    console.error('Error al insertar dato en la base de datos:', error);
    res.status(500).send('Error al insertar dato en la base de datos');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAAAAAA
app.get('/obtener-clave-cifrado', async (req, res) => {
  let connection;
  try {
    const { curp } = req.query;
    connection = await req.mysqlPool.getConnection();
    const [rows] = await connection.execute(
      'SELECT clave FROM registro WHERE curp = ?',
      [curp]
    );
    // Realizar consulta para obtener la clave de cifrado asociada a la CURP
    if (rows.length > 0) {
      // Retornar la clave de cifrado
      const claveCifrado = rows[0].clave;
      res.status(200).json({ claveCifrado });
    } else {
      // Si no se encontraron resultados, enviar un mensaje de error
      res.status(404).send('No se encontró ninguna clave de cifrado asociada a la CURP proporcionada');
    }
  } catch (error) {
    console.error('Error al obtener clave de cifrado:', error);
    res.status(500).send('Error al obtener clave de cifrado');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAAAAAAAAA
app.post('/insertar-dato2', async (req, res) => {
  let connection;
  try {
    const { curp, pregunta, respuesta, contrasena } = req.body;
    connection = await req.mysqlPool.getConnection();
    // Cifrar la contraseña antes de almacenarla en la base de datos
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contrasena, saltRounds);
    const hashedRespuesta = await bcrypt.hash(respuesta, saltRounds);
    // Verificar si ya existe un registro con la CURP proporcionada
    const [existingRecord] = await connection.execute('SELECT * FROM registro WHERE curp = ?', [curp]);
    // Si existe un registro con esa CURP, actualizar los campos
    if (existingRecord.length > 0) {
      const query = `
        UPDATE registro 
        SET pregunta = ?, respuesta = ?, contrasena = ?
        WHERE curp = ?
      `;
      await connection.execute(query, [pregunta, hashedRespuesta, hashedPassword, curp]);
      // Actualizar estado_cuenta y estado_usuario a 1
      const updateEstadoQuery = 'UPDATE registro SET estado_cuenta = 1, estado_usuario = 1 WHERE curp = ?';
      await connection.execute(updateEstadoQuery, [curp]);
      res.status(200).send('Actualización exitosa');
    } else {
      res.status(400).send('No existe ningún registro con esta CURP');
    }
  } catch (error) {
    console.error('Error al actualizar dato en la base de datos:', error);
    res.status(500).send('Error al actualizar dato en la base de datos');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAAAAAAAAAAAAAAA
app.post('/login', async (req, res) => {
  let plantel;
  let curp;
  let connection;
  let ipAddress;
  let requestedUrl;
  try {
    const { curp: curpFromReq, contrasena } = req.body;
    curp = curpFromReq; // Asignar el valor de la CURP desde el body de la solicitud
    ipAddress = req.ip.includes('::1') ? '127.0.0.1' : req.ip.replace(/^.*:/, ''); // Extraer la IP del cliente
    requestedUrl = req.originalUrl; // Obtener la URL solicitada
    console.log('Datos de inicio de sesión recibidos en el backend:', { curp, ipAddress, requestedUrl }); // Mostrar los datos en consola
    connection = await req.mysqlPool.getConnection();
    try {

      const query = 'SELECT * FROM registro WHERE curp = ?';
      const [results] = await connection.execute(query, [curp]);
      if (results.length > 0) {
        const user = results[0];
        const hashedPassword = user.contrasena;
        const match = await bcrypt.compare(contrasena, hashedPassword);
        if (match) {
          if (user.estado_usuario === 1) {
            if (user.estado_cuenta === 1) {
              // Verifica el rol del usuario
              const userRole = user.sesion;
              let roleName = '';
              if (userRole === 1) {
                roleName = ' 1';
              } else if (userRole === 2) {
                roleName = ' 2';
              } else if (userRole === 3) {
                roleName = ' 3';
              } else {
                roleName = 'Otro Rol';
              }
              plantel = user.plantel;
              app.locals.plantel = plantel;
              app.locals.curp = curp;
              app.locals.roleName = roleName;
              const updateQuery = 'UPDATE registro SET fecha_inicio_sesion = CURRENT_TIMESTAMP WHERE curp = ?';
              const [updateResult] = await connection.execute(updateQuery, [curp]);
              console.log(`Se actualizó ${updateResult.affectedRows} fila(s) en la tabla registro.`);
              console.log(`Inicio de sesión exitoso. Rol: ${roleName}`);
              console.log('Valor del plantel:', plantel);
              console.log('Valor de la curp:', curp);
              // Guardar datos en la tabla logs_iniciosesion
              const insertQuery = 'INSERT INTO logs_iniciosesion (curp, IP, URLS, HTTP, dia, hora, descripcion) VALUES (?, ?, ?, ?, CURRENT_DATE(), CURRENT_TIME(), ?)';
              await connection.execute(insertQuery, [curp, ipAddress, requestedUrl, res.statusCode, "Inicio de sesión exitoso"]);

              res.json({ success: true, role: userRole, roleName: roleName, plantel: plantel });

            } else if (user.estado_cuenta === 2) {
              console.log('Inicio de sesión fallido: La cuenta está bloqueada');
              // Guardar datos en la tabla logs_iniciosesion
              const insertQuery = 'INSERT INTO logs_iniciosesion (curp, IP, URLS, HTTP, dia, hora, descripcion) VALUES (?, ?, ?, ?, CURRENT_DATE(), CURRENT_TIME(), ?)';
              await connection.execute(insertQuery, [curp, ipAddress, requestedUrl, res.statusCode, "Inicio de sesión fallido: La cuenta está bloqueada"]);
              res.json({ success: false, message: 'La cuenta está bloqueada. Para recuperar su cuenta, restablezca su contraseña.' });
            }
          } else if (user.estado_usuario === 2) {
            console.log('Inicio de sesión fallido: El usuario ha sido dado de baja del sistema');
            // Guardar datos en la tabla logs_iniciosesion
            const insertQuery = 'INSERT INTO logs_iniciosesion (curp, IP, URLS, HTTP, dia, hora, descripcion) VALUES (?, ?, ?, ?, CURRENT_DATE(), CURRENT_TIME(), ?)';
            await connection.execute(insertQuery, [curp, ipAddress, requestedUrl, res.statusCode, "Inicio de sesión fallido: El usuario ha sido dado de baja del sistema"]);
            res.json({ success: false, message: 'El usuario ha sido dado de baja del sistema' });
          }
        } else {
          console.log('Inicio de sesión fallido: Contraseña incorrecta');
          // Guardar datos en la tabla logs_iniciosesion
          const insertQuery = 'INSERT INTO logs_iniciosesion (curp, IP, URLS, HTTP, dia, hora, descripcion) VALUES (?, ?, ?, ?, CURRENT_DATE(), CURRENT_TIME(), ?)';
          await connection.execute(insertQuery, [curp, ipAddress, requestedUrl, res.statusCode, "Inicio de sesión fallido: Contraseña incorrecta"]);
          res.json({ success: false, message: 'Contraseña incorrecta' });
        }
      } else {
        console.log('Inicio de sesión fallido: Usuario no encontrado');
        // Guardar datos en la tabla logs_iniciosesion
        const insertQuery = 'INSERT INTO logs_iniciosesion (curp, IP, URLS, HTTP, dia, hora, descripcion) VALUES (?, ?, ?, ?, CURRENT_DATE(), CURRENT_TIME(), ?)';
        await connection.execute(insertQuery, [curp, ipAddress, requestedUrl, res.statusCode, "Inicio de sesión fallido: Usuario no encontrado"]);
        res.json({ success: false, message: 'La CURP no está registrada' });
      }
    } finally {
      if (connection) {
        connection.release();
      }
    }
  } catch (error) {
    console.error('Error al procesar solicitud de inicio de sesión:', error);
    if (connection) {
      // Guardar datos en la tabla logs_iniciosesion
      const insertQuery = 'INSERT INTO logs_iniciosesion (curp, IP, URLS, HTTP, dia, hora, descripcion) VALUES (?, ?, ?, ?, CURRENT_DATE(), CURRENT_TIME(), ?)';
      await connection.execute(insertQuery, [curp, ipAddress, requestedUrl, res.statusCode, "Error al procesar solicitud de inicio de sesión"]);
      res.status(500).json({ success: false, message: 'Error al procesar solicitud de inicio de sesión' });
      connection.release();
    }

  }

});

//YAA
app.get('/docentes_asignacion', async (req, res) => {
  const plantel = req.app.locals.plantel;
  let connection;
  try {
    connection = await req.mysqlPool.getConnection();
    const query = `
      SELECT * 
      FROM registro AS r
      WHERE plantel = ? 
      AND sesion = ? 
      AND estado_usuario = 1
      AND NOT EXISTS (
        SELECT 1 
        FROM asignacion_g AS a 
        WHERE a.docente_curp = r.curp
      )`;
    const [results] = await connection.execute(query, [plantel, 3]);
    console.log(`Se encontraron ${results.length} registros para el plantel ${plantel} con sesión 3 y estado de usuario 1 sin asignaciones.`);
    res.json({ success: true, docentes: results });
  } catch (error) {
    console.error('Error al obtener registros de docentes:', error);
    res.status(500).json({ success: false, message: 'Error al obtener registros de docentes' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});



//YAAA
app.get('/obtener-correo/:curp', async (req, res) => {
  let connection;
  try {
    const { curp } = req.params;
    connection = await req.mysqlPool.getConnection();
    const query = 'SELECT correo FROM registro WHERE curp = ?';
    const [results] = await connection.execute(query, [curp]);
    if (results.length > 0) {
      const { correo } = results[0];
      res.json({ correo });
    } else {
      res.status(404).json({ error: 'No se encontraron datos para la CURP proporcionada' });
    }
  } catch (error) {
    console.error('Error al obtener el correo desde la base de datos:', error);
    res.status(500).json({ error: 'Error al obtener correo desde la base de datos' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAAA
app.get('/obtener-pregunta/:curp', async (req, res) => {
  let connection;
  try {
    const { curp } = req.params;
    connection = await req.mysqlPool.getConnection();
    const query = 'SELECT pregunta FROM registro WHERE curp = ?';
    const [results] = await connection.execute(query, [curp]);
    if (results.length > 0) {
      const { pregunta } = results[0];
      res.json({ pregunta: pregunta });
    } else {
      res.status(404).json({ error: 'No se encontraron datos para la CURP proporcionada' });
    }
  } catch (error) {
    console.error('Error al obtener nombre desde la base de datos:', error);
    res.status(500).json({ error: 'Error al obtener nombre desde la base de datos' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAAAA
app.get('/obtener-tipo-pregunta/:pregunta', async (req, res) => {
  let connection;
  try {
    const { pregunta } = req.params;
    connection = await req.mysqlPool.getConnection();
    const preguntaQuery = 'SELECT tipo_pregunta FROM pregunta WHERE id = ?'; // Ajusta la consulta según tu esquema de base de datos
    const [preguntaResults] = await connection.execute(preguntaQuery, [pregunta]);
    if (preguntaResults.length > 0) {
      const { tipo_pregunta } = preguntaResults[0];
      res.json({ tipo_pregunta: tipo_pregunta });
    } else {
      res.status(404).json({ error: 'No se encontraron datos para la pregunta proporcionada en la tabla pregunta' });
    }
  } catch (error) {
    console.error('Error al obtener tipo de pregunta desde la base de datos:', error);
    res.status(500).json({ error: 'Error al obtener tipo de pregunta desde la base de datos' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAAAAAA
app.post('/recuperar-contrasena', async (req, res) => {
  let connection;
  try {
    const { curp, respuesta } = req.body;
    console.log('Datos de recuperación de contraseña:', { curp, respuesta });
    connection = await req.mysqlPool.getConnection();

    // Verificar la existencia de la CURP y obtener la respuesta almacenada
    const checkExistenceQuery = 'SELECT respuesta FROM registro WHERE curp = ?';
    const [existenceResults] = await connection.execute(checkExistenceQuery, [curp]);
    if (existenceResults.length === 0) {
      return res.status(404).json({ error: 'La CURP no está registrada' });
    }
    const storedRespuesta = existenceResults[0].respuesta;

    // Verificar que la respuesta coincida
    const matchRespuesta = await bcrypt.compare(respuesta, storedRespuesta);
    if (!matchRespuesta) {
      console.log('La respuesta no es correcta');
      return res.status(401).json({ error: 'La respuesta no es correcta. Por favor, inténtelo de nuevo.' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error al procesar solicitud de recuperación de contraseña:', error);
    res.status(500).json({ error: 'Error al procesar solicitud de recuperación de contraseña' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});
//YAAAA
app.post('/actualizar-contrasena', async (req, res) => {
  let connection;
  try {
    const { curp, nuevaContrasena } = req.body;
    const ipAddress = req.ip.includes('::1') ? '127.0.0.1' : req.ip.replace(/^.*:/, ''); // Extraer la IP del cliente
    console.log('Datos de inicio de sesión recibidos en el backend:', { curp, nuevaContrasena, ipAddress }); // Mostrar los datos en consola
    connection = await req.mysqlPool.getConnection();
    try {
      // Consultar el registro actual para obtener el valor actual de la contraseña
      const selectQuery = 'SELECT contrasena FROM registro WHERE curp = ?';
      const [rows] = await connection.execute(selectQuery, [curp]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'No se encontró ningún registro con la CURP proporcionada' });
      }
      // Obtener la contraseña actual
      const contrasenaActual = rows[0].contrasena;
      // Guardar el valor actual de la contraseña en otro campo (por ejemplo, contrasena_anterior)
      const updateAnteriorQuery = 'UPDATE registro SET ultima_contrasena = ? WHERE curp = ?';
      await connection.execute(updateAnteriorQuery, [contrasenaActual, curp]);
      // Cifrar la nueva contraseña antes de almacenarla en la base de datos
      const saltRounds = 10;
      const hashedNuevaContrasena = await bcrypt.hash(nuevaContrasena, saltRounds);
      // Actualizar la contraseña en el campo correspondiente en la base de datos con la nueva contraseña cifrada
      const updateQuery = 'UPDATE registro SET contrasena = ? WHERE curp = ?';
      await connection.execute(updateQuery, [hashedNuevaContrasena, curp]);
      // Actualizar el estado_cuenta a 1 después de cambiar la contraseña
      const updateEstadoCuentaQuery = 'UPDATE registro SET estado_cuenta = 1 WHERE curp = ?';
      await connection.execute(updateEstadoCuentaQuery, [curp]);
      // Log de depuración
      console.log('Contraseña actualizada exitosamente.');
      // Consulta para insertar datos en la tabla logs_CanContra
      const insertQuery = 'INSERT INTO logs_CanContra (IP, fecha_hora, curp, descripcion) VALUES (?, NOW(), ?, ?)';
      await connection.execute(insertQuery, [ipAddress, curp, 'Se realizó la recuperación de contraseña mediante correo/pregunta secreta']);
      // Devolver una respuesta exitosa
      res.json({ success: true, message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
      console.error('Error al procesar solicitud de actualización de contraseña:', error);
      res.status(500).json({ error: 'Error al procesar solicitud de actualización de contraseña' });
    }
  } catch (error) {
    console.error('Error al procesar solicitud de actualización de contraseña:', error);
    res.status(500).json({ error: 'Error al procesar solicitud de actualización de contraseña' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAAA
app.post('/verificar-codigo', async (req, res) => {
  let connection;
  try {
    const { curp, token } = req.body;
    connection = await req.mysqlPool.getConnection();
    // Consultar el registro actual para obtener el token almacenado
    const selectQuery = 'SELECT token FROM registro WHERE curp = ?';
    const [rows] = await connection.execute(selectQuery, [curp]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró ningún registro con la CURP proporcionada' });
    }
    const tokenFromDatabase = rows[0].token;
    // Verificar si el token proporcionado coincide con el token almacenado en la base de datos
    if (token === tokenFromDatabase) {
      // El token proporcionado es válido
      return res.json({ valid: true });
    } else {
      // El token proporcionado no coincide
      return res.json({ valid: false });
    }
  } catch (error) {
    console.error('Error al procesar solicitud de verificación de código:', error);
    res.status(500).json({ error: 'Error al procesar solicitud de verificación de código' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAAAAAAAA
app.get('/grupo', async (req, res) => {
  let connection; // Declarar la variable de conexión aquí para que esté disponible en el bloque `finally`
  try {
    const query = 'SELECT id, grupo FROM grupo';
    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query);
    const options = results.map(result => ({
      value: result.id,
      label: result.grupo
    }));
    res.json(options);
  } catch (error) {
    console.error('Error al obtener datos de grupo:', error);
    res.status(500).json({ error: 'Error al obtener datos de grupo' });
  } finally {
    if (connection) {
      connection.release(); // Liberar la conexión a la base de datos incluso si ocurre un error
    }
  }
});

//YAAAAAAAAA
app.get('/grado', async (req, res) => {
  let connection;
  try {
    const query = 'SELECT id, grado FROM grado';
    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query);
    const options = results.map(result => ({
      value: result.id,
      label: result.grado
    }));
    res.json(options);
  } catch (error) {
    console.error('Error al obtener datos de grado:', error);
    res.status(500).json({ error: 'Error al obtener datos de grado' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAAA
app.get('/verificar_registros_curp', async (req, res) => {
  let connection;
  try {
    const curp = req.query.curp;
    const sql = 'SELECT COUNT(*) AS count FROM asignacion_g WHERE docente_curp = ?';
    connection = await req.mysqlPool.getConnection();
    const [result] = await connection.query(sql, [curp]);
    const count = result[0].count;
    // Mostrar mensaje en la consola si existen al menos un registro
    if (count >= 1) {
      console.log("Existe al menos un registroo con la misma CURP:", curp);
    }
    res.json({ count: count });
  } catch (error) {
    console.error("Error al verificar registros por CURP:", error);
    res.status(500).json({ error: "Error al verificar registros por CURP" });
  } finally {
    if (connection) {
      connection.release(); // Liberar la conexión si existe
    }
  }
});


const enviarCorreoAsigna = async (correo, nombre, grupo, grado, plantelId) => {
  console.log('Datos que se enviarán por correo:');
  console.log('Correo:', correo);
  console.log('Nombre:', nombre);
  console.log('Grupo:', grupo);
  console.log('Grado:', grado);
  console.log('Plantel ID:', plantelId);
  const config = {
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: 'zona012huazalingo@gmail.com',
      pass: 'kkcw ofwd qeon cpvr'
    },
    tls: {
      rejectUnauthorized: false
    }
  };
  let letraGrupo;
  switch (grupo) {
    case 1:
      letraGrupo = 'A';
      break;
    case 2:
      letraGrupo = 'B';
      break;
    default:
      letraGrupo = 'No definido';
      break;
  }
  let nombrePlantel;
  switch (plantelId) {
    case 1:
      nombrePlantel = 'Zona 012';
      break;
    case 2:
      nombrePlantel = 'Benito Juárez';
      break;
    case 3:
      nombrePlantel = 'Héroe Agustín';
      break;
    default:
      nombrePlantel = 'No definido';
      break;
  }
  const mensaje = {
    from: 'EduZona012 <zona012huazalingo@gmail.com>',
    to: correo,
    subject: 'Asignación de Grupo y Grado - EduZona012',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #00314A; padding: 20px;">
          <img src="https://eduzona.com.mx/logo.png" alt="EduZona012 Logo" style="max-width: 100px; max-height: 100px;">
        </div>
        <div style="background-color: #fff; padding: 20px;">
          <h3 style="margin-bottom: 20px;">Hola ${nombre},</h3>
          <p>Te informamos que has sido asignado al grupo ${letraGrupo} con grado ${grado} en el plantel ${nombrePlantel} de EduZona012.</p>
          <p>Por favor, toma nota de esta asignación y asegúrate de dirigirte a tus clases correspondientes según tu nuevo grupo y grado.</p>
        </div>
        <div style="background-color: #00314A; padding: 20px; text-align: center;">
          <p style="margin-bottom: 0; color: #fff;">© 2024 EduZona012. Todos los derechos reservados.</p>
        </div>
      </div>
    `
  };
  const transport = nodemailer.createTransport(config);
  try {
    const info = await transport.sendMail(mensaje);
    console.log('Correo electrónico enviado:', info);
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    throw error;
  }
};

//YAAAA
app.post('/asignar_grupo_grado', async (req, res) => {
  let connection;
  try {
    const { docenteId, grupo, grado, plantelId } = req.body;
    const sql = 'INSERT INTO asignacion_g (docente_curp, grado_id, grupo_id, docente_plantel) VALUES (?, ?, ?, ?)';
    connection = await req.mysqlPool.getConnection();
    await connection.query(sql, [docenteId, grado, grupo, plantelId]);
    console.log('Asignación guardada correctamente');
    const emailQuery = `SELECT correo, nombre, plantel FROM registro WHERE curp = ?`;
    const [rows] = await connection.query(emailQuery, [docenteId]);
    const { correo, nombre } = rows[0]; // Asegúrate de incluir plantel aquí
    await enviarCorreoAsigna(correo, nombre, grupo, grado, plantelId);
    res.json({ success: true, message: 'Asignación guardada correctamente' });
  } catch (error) {
    console.error('Error al guardar la asignación: ', error);
    res.status(500).json({ success: false, message: 'Error al guardar la asignación' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAAA
app.get('/asignaciong', async (req, res) => {
  const plantel = req.app.locals.plantel;
  let connection;
  try {
    connection = await req.mysqlPool.getConnection();
    const query = `
      SELECT ag.*, r.nombre, r.aPaterno, r.aMaterno
      FROM asignacion_g AS ag
      JOIN registro AS r ON ag.docente_curp = r.curp
      WHERE ag.docente_plantel = ?
    `;
    const [results] = await connection.execute(query, [plantel]);
    console.log(`Se encontraron ${results.length} registros para el plantel ${plantel}`);
    results.forEach(docente => {
      console.log("ID:", docente.id);
      console.log("Nombre:", docente.nombre);
      console.log("Apellido Paterno:", docente.aPaterno);
      console.log("Apellido Materno:", docente.aMaterno);
    });
    res.json({ success: true, docentes: results });
  } catch (error) {
    console.error('Error al obtener registros de docentes:', error);
    res.status(500).json({ success: false, message: 'Error al obtener registros de docentes' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});



const enviarCorreoActAsig = async (correo, nombre, grupo, grado, plantel) => {
  const config = {
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: 'zona012huazalingo@gmail.com',
      pass: 'kkcw ofwd qeon cpvr'
    },
    tls: {
      rejectUnauthorized: false
    }
  };
  let letraGrupo;
  switch (grupo) {
    case 1:
      letraGrupo = 'A';
      break;
    case 2:
      letraGrupo = 'B';
      break;
    default:
      letraGrupo = 'No definido';
      break;
  }
  let nombrePlantel;
  switch (plantel) {
    case 1:
      nombrePlantel = 'Zona 012';
      break;
    case 2:
      nombrePlantel = 'Benito Juárez';
      break;
    case 3:
      nombrePlantel = 'Héroe Agustín';
      break;
    default:
      nombrePlantel = 'No definido';
      break;
  }
  const mensaje = {
    from: 'EduZona012 <zona012huazalingo@gmail.com>',
    to: correo,
    subject: 'Actualización de Asignación de Grupo y Grado - EduZona012',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #00314A; padding: 20px;">
          <img src="https://eduzona.com.mx/logo.png" alt="EduZona012 Logo" style="max-width: 100px; max-height: 100px;">
        </div>
        <div style="background-color: #fff; padding: 20px;">
          <h3 style="margin-bottom: 20px;">Hola ${nombre},</h3>
          <p>Te informamos que tu asignación de grupo y grado ha sido actualizada en el plantel ${nombrePlantel} de EduZona012.</p>
          <p>Ahora estás asignado al grupo ${letraGrupo} con grado ${grado}.</p>
          <p>Por favor, toma nota de esta actualización y asegúrate de dirigirte a tus clases correspondientes según tu nuevo grupo y grado.</p>
        </div>
        <div style="background-color: #00314A; padding: 20px; text-align: center;">
          <p style="margin-bottom: 0; color: #fff;">© 2024 EduZona012. Todos los derechos reservados.</p>
        </div>
      </div>
    `
  };
  const transport = nodemailer.createTransport(config);
  try {
    const info = await transport.sendMail(mensaje);
    console.log('Correo electrónico enviado:', info);
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    throw error;
  }
};

//YAAAAAAAAA
app.post('/actualizar_asignacion', async (req, res) => {
  let connection;
  try {
    const { docenteId, grupo, grado } = req.body;
    console.log('Datos recibidos:', { docenteId, grupo, grado }); // Imprimir datos recibidos en la consola del servidor
    const sql = 'UPDATE asignacion_g SET grado_id = ?, grupo_id = ? WHERE id = ?';
    connection = await req.mysqlPool.getConnection();
    await connection.query(sql, [grado, grupo, docenteId]);
    console.log('Asignación actualizada correctamente');
    // Obtener el docente_curp de la tabla asignacion_g
    const docenteCurpQuery = `SELECT docente_curp FROM asignacion_g WHERE id = ?`;
    const [docenteCurpRows] = await connection.query(docenteCurpQuery, [docenteId]);
    const docenteCurp = docenteCurpRows[0].docente_curp;
    // Obtener el correo asociado a la CURP desde la tabla registro
    const emailQuery = `SELECT correo, nombre, plantel FROM registro WHERE curp = ?`;
    const [rows] = await connection.query(emailQuery, [docenteCurp]);
    if (rows.length === 0) {
      throw new Error('No se encontró ningún registro con la CURP proporcionada');
    }
    const { correo, nombre, plantel } = rows[0];
    await enviarCorreoActAsig(correo, nombre, grupo, grado, plantel);
    res.json({ success: true, message: 'Asignación actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar la asignación: ', error);
    res.status(500).json({ success: false, message: 'Error al actualizar la asignación' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


const enviarCorreoBorraAsig = async (correo, nombre, grupo_id, grado_id, plantel) => {
  const config = {
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: 'zona012huazalingo@gmail.com',
      pass: 'kkcw ofwd qeon cpvr'
    },
    tls: {
      rejectUnauthorized: false
    }
  };
  let letraGrupo;
  switch (grupo_id) {
    case 1:
      letraGrupo = 'A';
      break;
    case 2:
      letraGrupo = 'B';
      break;
    default:
      letraGrupo = 'No definido';
      break;
  }
  let nombrePlantel;
  switch (plantel) {
    case 1:
      nombrePlantel = 'Zona 012';
      break;
    case 2:
      nombrePlantel = 'Benito Juárez';
      break;
    case 3:
      nombrePlantel = 'Héroe Agustín';
      break;
    default:
      nombrePlantel = 'No definido';
      break;
  }
  const mensaje = {
    from: 'EduZona012 <zona012huazalingo@gmail.com>',
    to: correo,
    subject: 'Eliminación de Asignación de Grupo y Grado - EduZona012',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #00314A; padding: 20px;">
          <img src="https://eduzona.com.mx/logo.png" alt="EduZona012 Logo" style="max-width: 100px; max-height: 100px;">
        </div>
        <div style="background-color: #fff; padding: 20px;">
          <h3 style="margin-bottom: 20px;">Hola ${nombre},</h3>
          <p>Te informamos que tu asignación de grupo y grado ha sido eliminada en el plantel ${nombrePlantel} de EduZona012.</p>
          <p>Anteriormente estabas asignado al grupo ${letraGrupo} con grado ${grado_id}.</p>
          <p>Si tienes alguna pregunta o necesitas más información, no dudes en contactarnos.</p>
        </div>
        <div style="background-color: #00314A; padding: 20px; text-align: center;">
          <p style="margin-bottom: 0; color: #fff;">© 2024 EduZona012. Todos los derechos reservados.</p>
        </div>
      </div>
    `
  };



  const transport = nodemailer.createTransport(config);
  try {
    const info = await transport.sendMail(mensaje);
    console.log('Correo electrónico enviado:', info);
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    throw error;
  }
};

//YAAA
app.post('/borrar_asignacion', async (req, res) => {
  let connection;
  try {
    const { docenteId } = req.body;

    // Obtener datos de la asignación a eliminar
    const selectCurpSql = 'SELECT docente_curp, grado_id, grupo_id FROM asignacion_g WHERE id = ?';
    connection = await req.mysqlPool.getConnection();
    const [rows] = await connection.query(selectCurpSql, [docenteId]);
    const { docente_curp, grado_id, grupo_id } = rows[0];

    // Vaciar el campo docente_curp en la tabla alumnos
    const updateAlumnosSql = 'UPDATE alumnos SET docente_curp = NULL WHERE docente_curp = ? AND grado_id = ? AND grupo_id = ?';
    await connection.query(updateAlumnosSql, [docente_curp, grado_id, grupo_id]);

    // Borrar la asignación de la tabla asignacion_g
    const deleteSql = 'DELETE FROM asignacion_g WHERE id = ?';
    await connection.query(deleteSql, [docenteId]);
    console.log('Asignación borrada correctamente');

    // Obtener datos del docente para enviar el correo de notificación
    const selectCorreoSql = 'SELECT correo, nombre, plantel FROM registro WHERE curp = ?';
    const [docenteRows] = await connection.query(selectCorreoSql, [docente_curp]);
    const { correo, nombre, plantel } = docenteRows[0];

    // Enviar correo de notificación
    await enviarCorreoBorraAsig(correo, nombre, grupo_id, grado_id, plantel);

    // Obtener la dirección IP del cliente
    const ipAddress = req.ip.includes('::1') ? '127.0.0.1' : req.ip.replace(/^.*:/, '');

    // Insertar registro de eliminación en la tabla logs_eliasig
    const insertQuery = 'INSERT INTO logs_eliasig (IP, fecha_hora, curp, descripcion) VALUES (?, NOW(), ?, ?)';
    await connection.execute(insertQuery, [ipAddress, docente_curp, 'Se eliminó una asignación de grupo y grado a un docente']);

    res.json({ success: true, message: 'Asignación borrada correctamente' });
  } catch (error) {
    console.error('Error al borrar la asignación: ', error);
    res.status(500).json({ success: false, message: 'Error al borrar la asignación' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAA
app.post('/borrar_asignacionAdmin', async (req, res) => {
  let connection;
  try {
    const { curp } = req.body;

    // Mostrar el valor de curp en la consola
    console.log('Curp recibida:', curp);

    // Obtener datos de la asignación a eliminar
    const selectAssignSql = 'SELECT id, grado_id, grupo_id FROM asignacion_g WHERE docente_curp = ?';
    connection = await req.mysqlPool.getConnection();
    const [rows] = await connection.query(selectAssignSql, [curp]);

    // Si no se encuentra ninguna asignación para la Curp dada, retornar un mensaje de éxito
    if (rows.length === 0) {
      console.log(`No se encontraron asignaciones para la Curp ${curp}`);
      res.json({ success: true, message: 'No se encontraron asignaciones para esta Curp' });
      return;
    }

    // Iterar sobre las asignaciones encontradas para realizar las acciones necesarias
    for (const row of rows) {
      const { id, grado_id, grupo_id } = row;

      // Vaciar el campo docente_curp en la tabla alumnos
      const updateAlumnosSql = 'UPDATE alumnos SET docente_curp = NULL WHERE docente_curp = ? AND grado_id = ? AND grupo_id = ?';
      await connection.query(updateAlumnosSql, [curp, grado_id, grupo_id]);

      // Borrar la asignación de la tabla asignacion_g
      const deleteSql = 'DELETE FROM asignacion_g WHERE id = ?';
      await connection.query(deleteSql, [id]);
      console.log('Asignación borrada correctamente');

      // Obtener datos del docente para enviar el correo de notificación
      const selectCorreoSql = 'SELECT correo, nombre, plantel FROM registro WHERE curp = ?';
      const [docenteRows] = await connection.query(selectCorreoSql, [curp]);
      const { correo, nombre, plantel } = docenteRows[0];

      // Enviar correo de notificación
      await enviarCorreoBorraAsig(correo, nombre, grupo_id, grado_id, plantel);

      // Obtener la dirección IP del cliente
      const ipAddress = req.ip.includes('::1') ? '127.0.0.1' : req.ip.replace(/^.*:/, '');

      // Insertar registro de eliminación en la tabla logs_eliasig
      const insertQuery = 'INSERT INTO logs_eliasig (IP, fecha_hora, curp, descripcion) VALUES (?, NOW(), ?, ?)';
      await connection.execute(insertQuery, [ipAddress, curp, 'Se eliminó una asignación de grupo y grado a un docente']);
    }

    res.json({ success: true, message: 'Asignaciones borradas correctamente' });
  } catch (error) {
    console.error('Error al borrar la asignación: ', error);
    res.status(500).json({ success: false, message: 'Error al borrar la asignación' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


//YAAAAAAAAAAA
app.post('/verificar-asignacion', async (req, res) => {
  let connection;
  try {
    const curp = req.app.locals.curp;
    // Realizar la consulta en la tabla asignacion_g para verificar si existe la CURP
    connection = await req.mysqlPool.getConnection();
    const query = 'SELECT COUNT(*) AS count FROM asignacion_g WHERE docente_curp = ?';
    const [results] = await connection.execute(query, [curp]);
    const count = results[0].count; // Obtiene el número de coincidencias

    // Verificar si la CURP existe en la tabla asignacion_g
    if (count > 0) {
      // Si la CURP existe, responder con un mensaje de éxito
      res.status(200).json({ success: true, message: 'La CURP existe en la tabla asignacion_g' });
    } else {
      // Si la CURP no existe, responder con un mensaje de error
      res.status(404).json({ success: false, message: 'La CURP no existe en la tabla asignacion_g' });
    }
  } catch (error) {
    console.error('Error al verificar la CURP en la tabla asignacion_g:', error);
    res.status(500).json({ success: false, message: 'Error al verificar la CURP en la tabla asignacion_g' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


//YAAAA
app.post('/verificar-duplicados', async (req, res) => {
  const plantel = req.app.locals.plantel;
  const { cicloEscolar, alumnos } = req.body;
  let connection;

  try {
    connection = await req.mysqlPool.getConnection();

    let duplicadosEncontrados = false;

    for (let i = 1; i < alumnos.length; i++) {
      const studentData = alumnos[i];
      const checkQuery = 'SELECT COUNT(*) AS count FROM alumnos WHERE nombre = ? AND aPaterno = ? AND aMaterno = ? AND sexo = ? AND ciclo_escolar = ? AND plantel_id = ?';
      const [checkResult] = await connection.execute(checkQuery, [studentData[0], studentData[1], studentData[2], studentData[3], cicloEscolar, plantel]);
      const count = checkResult[0].count;

      if (count > 0) {
        // Si se encuentra el alumno en la tabla, marcar que se encontraron duplicados, mostrar un mensaje en la consola y detener la iteración
        duplicadosEncontrados = true;
        console.log('Alumno encontrado en la base de datos:', studentData);
        break;
      }
    }

    if (duplicadosEncontrados) {
      console.log('Si se encontraron duplicados');
      // Si se encontraron duplicados, enviar una respuesta al frontend indicando esto
      return res.status(200).json({ duplicadosEncontrados: true });
    } else {
      // Si no se encontraron duplicados, enviar una respuesta indicando que la verificación está completa

      console.log('No se encontraron duplicados');
      return res.status(200).json({ duplicadosEncontrados: false });
    }
  } catch (error) {
    console.error('Error al verificar duplicados:', error);
    res.status(500).send('Error al verificar duplicados');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAAAAAAAAAAA
app.post('/registrar-alumnos', async (req, res) => {
  const plantel = req.app.locals.plantel;
  const curp = req.app.locals.curp;
  const { cicloEscolar, alumnos } = req.body; // Recibir cicloEscolar y alumnos del cuerpo de la solicitud

  let connection;

  try {
    // Realizar la consulta en la tabla asignacion_g para obtener grado_id y grupo_id
    connection = await req.mysqlPool.getConnection();
    const query = 'SELECT grado_id, grupo_id FROM asignacion_g WHERE docente_curp = ?';
    const [results] = await connection.execute(query, [curp]);

    // Verificar si se encontraron asignaciones para el docente
    if (results.length > 0) {
      const { grado_id, grupo_id } = results[0];
      console.log('Asignación encontrada - CURP:', curp, '- Grado:', grado_id, '- Grupo:', grupo_id);

      // Iterar sobre los subarrays que contienen los datos de los alumnos
      const headers = alumnos[0];
      console.log('Datos recibidos del frontend:', alumnos); // Mostrar datos recibidos del frontend

      for (let i = 1; i < alumnos.length; i++) {
        const studentData = alumnos[i];

        // Crear un objeto de alumno utilizando los encabezados como claves
        const alumno = {
          docente_curp: curp,
          nombre: studentData[0], // El primer valor es el nombre
          aPaterno: studentData[1], // El segundo valor es el apellido paterno
          aMaterno: studentData[2], // El tercer valor es el apellido materno
          sexo: studentData[3], // El cuarto valor es el sexo 
          grado_id: grado_id, // Asignar el grado_id obtenido de la consulta
          grupo_id: grupo_id, // Asignar el grupo_id obtenido de la consulta
          ciclo_escolar: cicloEscolar // Guardar el ciclo escolar en el objeto alumno
        };

        // Insertar el alumno en la tabla alumnos
        // Insertar el alumno en la tabla alumnos
        const insertQuery = 'INSERT INTO alumnos (docente_curp, nombre, aPaterno, aMaterno, grado_id, grupo_id, sexo, ciclo_escolar, plantel_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        await connection.execute(insertQuery, [alumno.docente_curp, alumno.nombre, alumno.aPaterno, alumno.aMaterno, alumno.grado_id, alumno.grupo_id, alumno.sexo, alumno.ciclo_escolar, plantel]);

        console.log('Alumno insertado en la base de datos:', alumno);
      }
    } else {
      console.log('No se encontraron asignaciones para el docente con CURP:', curp);
    }
  } catch (error) {
    console.error('Error al obtener asignaciones de docente o al insertar alumnos:', error);
    res.status(500).send('Error al obtener asignaciones de docente o al insertar alumnos');
    return;
  } finally {
    if (connection) {
      connection.release();
    }
  }

  res.status(200).send('Datos recibidos correctamente y alumnos registrados en la base de datos');
});

//YAAAAAAAAAAAA
app.get('/alumnos', async (req, res) => {
  const curp = req.app.locals.curp;
  let connection;

  try {
    // Intentamos obtener una conexión del pool
    connection = await pool.getConnection();

    // Consulta para obtener grado_id y grupo_id del docente
    const [asignacionRows] = await connection.execute(`
      SELECT grado_id, grupo_id
      FROM asignacion_g
      WHERE docente_curp = ?
    `, [curp]);

    // Verificar si se encontraron resultados en la tabla asignacion_g
    if (asignacionRows.length === 0) {
      return res.status(404).json({ error: 'No se encontraron asignaciones para el docente' });
    }

    const { grado_id, grupo_id } = asignacionRows[0]; // Tomar el primer resultado

    // Consulta para obtener los datos de los alumnos
    const [alumnosRows] = await connection.execute(`
      SELECT alumnos.*, 
             CONCAT(alumnos.nombre, ' ', alumnos.aPaterno, ' ', alumnos.aMaterno) AS nombre_completo,
             grupo.grupo AS nombre_grupo 
      FROM alumnos 
      INNER JOIN grupo ON alumnos.grupo_id = grupo.id 
      WHERE docente_curp = ? AND grado_id = ? AND grupo_id = ?
    `, [curp, grado_id, grupo_id]);

    // Verificar si se encontraron resultados en la tabla alumnos
    if (alumnosRows.length === 0) {
      return res.status(404).json({ error: 'No se encontraron alumnos para el docente en este grado y grupo' });
    }

    // Enviamos los resultados al cliente
    res.json(alumnosRows);
  } catch (error) {
    console.error('Error en la consulta SQL:', error);
    res.status(500).json({ error: 'Error en la consulta SQL' });
  } finally {
    // Liberamos la conexión de vuelta al pool en cualquier caso
    if (connection) {
      connection.release();
    }
  }
});

//YAAAA
app.post('/borrarAlumnos', async (req, res) => {
  let connection;

  try {
    const { docenteId } = req.body;
    connection = await req.mysqlPool.getConnection();
    const deleteSql = 'DELETE FROM alumnos WHERE idAlumnos = ?';
    await connection.query(deleteSql, [docenteId]);
    console.log('Alumno borrado correctamente');
    res.json({ success: true, message: 'Alumno borrado correctamente' });
  } catch (error) {
    console.error('Error al borrar alumno: ', error);
    res.status(500).json({ success: false, message: 'Error al borrar alumno' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAAAAAAAA
app.post('/actualizarAlumno', async (req, res) => {
  let connection;

  try {
    const { idAlumnos, nombre, aPaterno, aMaterno } = req.body;
    console.log('Datos recibidos:', { idAlumnos, nombre, aPaterno, aMaterno }); // Imprimir datos recibidos en la consola del servidor
    const sql = 'UPDATE alumnos SET nombre = ?, aPaterno = ?, aMaterno = ? WHERE idAlumnos = ?';
    connection = await req.mysqlPool.getConnection();
    await connection.query(sql, [nombre, aPaterno, aMaterno, idAlumnos]);
    console.log('Alumno actualizado correctamente');
    res.json({ success: true, message: 'Alumno actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar alumno: ', error);
    res.status(500).json({ success: false, message: 'Error al actualizar alumno' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAAAAAAAA
app.post('/insertar_docente_curp_alumnos', async (req, res) => {
  let connection;

  try {
    const { curp, plantelId, grupo, grado } = req.body;
    console.log('Datos recibidos para insertar en la tabla alumnos:', { curp, plantelId, grupo, grado });

    connection = await req.mysqlPool.getConnection();

    const verifyQuery = 'SELECT COUNT(*) AS count FROM alumnos WHERE plantel_id = ? AND grupo_id = ? AND grado_id = ?';
    const [verifyResult] = await connection.query(verifyQuery, [plantelId, grupo, grado]);

    const count = verifyResult[0].count;

    if (count > 0) {
      const updateQuery = 'UPDATE alumnos SET docente_curp = ? WHERE plantel_id = ? AND grupo_id = ? AND grado_id = ?';
      await connection.query(updateQuery, [curp, plantelId, grupo, grado]);
      console.log('CURP del docente insertada correctamente en la tabla de alumnos');
      res.status(200).json({ message: 'CURP del docente insertada correctamente en la tabla de alumnos' });
    } else {
      console.log('No hay alumnos para ese grupo grado y plantel');
      res.status(200).json({ message: 'No se encontraron registros que cumplan las condiciones especificadas' });
    }
  } catch (error) {
    console.error('Error al insertar la CURP del docente: ', error);
    res.status(500).json({ error: 'Error al insertar la CURP del docente' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


//YAAAAAAAA
app.post('/Insercategorias', async (req, res) => {
  let connection;

  try {
    const { categoria, valor } = req.body;
    console.log('Datos recibidos:', { categoria, valor }); // Imprimir datos recibidos en la consola del servidor
    const sql = 'INSERT INTO Categorias (nombre, valor_id) VALUES (?, ?)'; // Sentencia SQL de inserción
    connection = await req.mysqlPool.getConnection();
    await connection.query(sql, [categoria, valor]); // Insertar la categoría en la tabla Categorias junto con su valor
    console.log('Categoría insertada correctamente');
    res.json({ success: true, message: 'Categoría insertada correctamente' });
  } catch (error) {
    console.error('Error al insertar categoría: ', error);
    res.status(500).json({ success: false, message: 'Error al insertar categoría:' });
  } finally {
    if (connection) {
      connection.release(); // Liberar la conexión de vuelta al pool
    }
  }
});


//YAAAAAAAAAAAAA
app.get('/categoria', async (req, res) => {
  let connection;

  try {
    const query = 'SELECT id, nombre, valor_id FROM Categorias'; // Modificación para incluir valor_id
    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query);
    const options = results.map(result => ({
      value: result.id,
      label: result.nombre,
      valor_id: result.valor_id // Incluir valor_id en el objeto retornado
    }));
    res.json(options);
  } catch (error) {
    console.error('Error al obtener datos de las categorias:', error);
    res.status(500).json({ error: 'Error al obtener datos de las categorias' });
  } finally {
    if (connection) {
      connection.release(); // Liberar la conexión de vuelta al pool
    }
  }
});


//YAAAAAAAA
app.post("/verificarSalAlumn", async (req, res) => {
  let connection;

  try {
    console.log("Recibiendo datos:", req.body); // Agregar este log para mostrar los datos recibidos

    const { idAlumnos, categoria } = req.body;

    // Obtener una conexión del pool de conexiones MySQL
    connection = await req.mysqlPool.getConnection();

    // Consulta SQL para verificar la existencia de idAlumnos y categoria en la tabla saludAlum
    const query = "SELECT COUNT(*) AS count FROM saludAlum WHERE idAlumno = ? AND idCategoria = ?";
    const [results] = await connection.execute(query, [idAlumnos, categoria]);

    const count = results[0].count;
    console.log("Cantidad de datos encontrados:", count);
    // Enviar respuesta indicando si los datos existen o no en la base de datos
    res.json({ exists: count > 0 });
  } catch (error) {
    console.error("Error al verificar los datos en la base de datos:", error);
    res.status(500).json({ error: "Error al verificar los datos en la base de datos" });
  } finally {
    if (connection) {
      connection.release(); // Liberar la conexión al pool
    }
  }
});

//YAAA
app.get('/verificar_asignacion_grado_grupo', async (req, res) => {
  let connection;

  try {
    const { plantelId, grupo, grado } = req.query;

    // Mostrar los datos recibidos en la consola
    console.log("Datos recibidos:");
    console.log("Grado:", grado);
    console.log("Grupo:", grupo);
    console.log("Plantel ID:", plantelId);

    // Obtener una conexión del pool de conexiones MySQL
    connection = await req.mysqlPool.getConnection();

    // Consulta SQL para verificar la asignación
    const query = `
        SELECT COUNT(*) AS count
        FROM asignacion_g
        WHERE grado_id = ? AND grupo_id = ? AND docente_plantel = ?
    `;
    const [results] = await connection.execute(query, [grado, grupo, plantelId]);

    // Devolver el resultado al cliente
    res.json({ count: results[0].count });
  } catch (error) {
    console.error("Error al verificar la asignación de grado y grupo:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    if (connection) {
      connection.release(); // Liberar la conexión al pool
    }
  }
});


//YAAA
app.get('/verificar_asignacionGG', async (req, res) => {
  let connection;

  try {
    const plantel = req.app.locals.plantel;
    const { grupo, grado } = req.query;

    // Mostrar los datos recibidos en la consola
    console.log("Datos recibidos:");
    console.log("Grado:", grado);
    console.log("Grupo:", grupo);
    console.log("Plantel ID:", plantel);

    // Obtener una conexión del pool de conexiones MySQL
    connection = await req.mysqlPool.getConnection();

    // Consulta SQL para verificar la asignación
    const query = `
        SELECT COUNT(*) AS count
        FROM asignacion_g
        WHERE grado_id = ? AND grupo_id = ? AND docente_plantel = ?
    `;
    const [results] = await connection.execute(query, [grado, grupo, plantel]);

    // Devolver el resultado al cliente
    res.json({ count: results[0].count });
  } catch (error) {
    console.error("Error al verificar la asignación de grado y grupo:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  } finally {
    if (connection) {
      connection.release(); // Liberar la conexión al pool
    }
  }
});

//YAAA
app.get('/valorCategoria', async (req, res) => {
  let connection;

  try {
    const query = 'SELECT id, valor FROM valorCate';
    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query);
    const options = results.map(result => ({
      value: result.id,
      label: result.valor
    }));
    res.json(options);
  } catch (error) {
    console.error('Error al obtener datos de las categorias:', error);
    res.status(500).json({ error: 'Error al obtener datos de las categorias' });
  } finally {
    if (connection) {
      connection.release(); // Liberar la conexión al pool
    }
  }
});


//YAAAA
app.post('/guardarDatosSalud', async (req, res) => {
  let connection;

  try {
    const { idAlumnos, categoria, valor } = req.body;
    console.log('Datos recibidos:', { idAlumnos, categoria, valor });
    connection = await req.mysqlPool.getConnection();
    const query = 'INSERT INTO saludAlum (idAlumno, idCategoria, valor, fecha_hora) VALUES (?, ?, ?, NOW())';
    await connection.query(query, [idAlumnos, categoria, valor]);
    console.log('Datos insertados correctamente en la tabla saludAlum');
    res.json({ success: true, message: 'Datos insertados correctamente en la tabla saludAlum' });
  } catch (error) {
    console.error('Error al procesar la solicitud: ', error);
    res.status(500).json({ success: false, message: 'Error al procesar la solicitud' });
  } finally {
    if (connection) {
      connection.release(); // Liberar la conexión al pool
    }
  }
});


//YAAAAAAAA
app.get('/saludAlum', async (req, res) => {
  let connection;

  try {
    // Suponiendo que recibes la CURP del docente en el parámetro de consulta 'curpDocente'
    const curpDocente = req.app.locals.curp;

    connection = await pool.getConnection();

    // Paso 1: Obtener la información de asignación del docente
    const [asignacionRows] = await connection.execute(`
      SELECT grado_id, grupo_id, docente_plantel
      FROM asignacion_g
      WHERE docente_curp = ?;
    `, [curpDocente]);

    // Paso 2: Obtener los alumnos que cumplen con las condiciones de grado, grupo y plantel
    const alumnosQuery = `
      SELECT idAlumnos
      FROM alumnos
      WHERE grado_id = ? AND grupo_id = ? AND plantel_id = ?;
    `;
    const [alumnosRows] = await connection.execute(alumnosQuery, [
      asignacionRows[0].grado_id,
      asignacionRows[0].grupo_id,
      asignacionRows[0].docente_plantel
    ]);

    // Paso 3: Obtener los datos de saludAlum para los alumnos obtenidos en el Paso 2
    const idAlumnos = alumnosRows.map(row => row.idAlumnos).join(',');
    const saludAlumQuery = `
    SELECT saludAlum.*, 
           Categorias.valor_id AS valor_id,
           Categorias.nombre AS nombreCategoria,
           alumnos.nombre AS nombreAlumno,
           alumnos.aPaterno AS aPaternoAlumno,
           alumnos.aMaterno AS aMaternoAlumno
    FROM saludAlum
    INNER JOIN Categorias ON saludAlum.idCategoria = Categorias.id
    INNER JOIN alumnos ON saludAlum.idAlumno = alumnos.idAlumnos
    WHERE saludAlum.idAlumno IN (${idAlumnos});
  `;

    const [saludAlumRows] = await connection.execute(saludAlumQuery);

    res.json(saludAlumRows);
  } catch (error) {
    console.error('Error en la consulta SQL:', error);
    res.status(500).json({ error: 'Error en la consulta SQL' });
  } finally {
    if (connection) {
      connection.release(); // Liberar la conexión al pool
    }
  }
});


//YAAAA
app.post('/actualizarSalud', async (req, res) => {
  let connection;
  try {
    const { id, valor } = req.body;
    console.log('Datos recibidos:', { id, valor }); // Imprimir datos recibidos en la consola del servidor
    const sql = 'UPDATE saludAlum SET valor = ? WHERE id = ?';
    connection = await req.mysqlPool.getConnection();
    await connection.query(sql, [valor, id]);
    console.log('Datos actualizados correctamente en la tabla saludAlum');
    res.json({ success: true, message: 'Datos actualizados correctamente en la tabla saludAlum' });
  } catch (error) {
    console.error('Error al actualizar alumno: ', error);
    res.status(500).json({ success: false, message: 'Error al actualizar alumno' });
  } finally {
    if (connection) {
      connection.release(); // Liberar la conexión al pool
    }
  }
});

//YAAA
app.delete('/saludAlumBorrar', async (req, res) => {
  let connection;
  try {
    const { id } = req.body;
    connection = await req.mysqlPool.getConnection();
    const deleteSql = 'DELETE FROM saludAlum WHERE id = ?';
    await connection.query(deleteSql, [id]);
    console.log('Alumno borrado correctamente');
    res.json({ success: true, message: 'Alumno borrado correctamente' });
  } catch (error) {
    console.error('Error al borrar alumno: ', error);
    res.status(500).json({ success: false, message: 'Error al borrar alumno' });
  } finally {
    if (connection) {
      connection.release(); // Liberar la conexión al pool
    }
  }
});


 


app.get('/grupogradoDispo', async (req, res) => {
  let connection;

  try {
    const plantel = req.app.locals.plantel;
    console.log('Plantel recibido alumnos:', plantel); // Imprimir el valor de plantel en la consola

    const query = 'SELECT grado_id, grupo_id FROM alumnos WHERE plantel_id = ? AND docente_curp IS NULL';
    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query, [plantel]);
    const options = results.map(result => ({
      grado_id: result.grado_id,
      grupo_id: result.grupo_id
    }));
    console.log('Grupos y grados obtenidos:', options); // Imprimir los grupos y grados obtenidos en la consola

    res.json(options);
  } catch (error) {
    console.error('Error al obtener los grupos y grados disponibles:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});



//YAAAAAAAAA
app.get('/saludAlumRe', async (req, res) => {
  let connection; // Declarar la variable de conexión aquí para que esté disponible en el bloque `finally`
  try {
    const query = 'SELECT * FROM saludAlum'; // Seleccionar todos los campos de la tabla saludAlum
    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query);
    res.json(results);
  } catch (error) {
    console.error('Error al obtener datos de saludAlum:', error);
    res.status(500).json({ error: 'Error al obtener datos de saludAlum' });
  } finally {
    if (connection) {
      connection.release(); // Liberar la conexión a la base de datos incluso si ocurre un error
    }
  }
});




//YAAA
app.get('/vacunas', async (req, res) => {
  let connection;
  try {
    const query = 'SELECT id, nombre FROM vacunas';
    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query);
    const options = results.map(result => ({
      value: result.id,
      label: result.nombre
    }));
    res.json(options);
  } catch (error) {
    console.error('Error al obtener datos de vacunas:', error);
    res.status(500).json({ error: 'Error al obtener datos de vacunas' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


//YAAA
app.get('/alergias', async (req, res) => {
  let connection;
  try {
    const query = 'SELECT id, alergia FROM alergias';
    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query);
    const options = results.map(result => ({
      value: result.id,
      label: result.alergia
    }));
    res.json(options);
  } catch (error) {
    console.error('Error al obtener datos de alergias:', error);
    res.status(500).json({ error: 'Error al obtener datos de alergias' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

//YAAA
app.get('/discapacidad', async (req, res) => {
  let connection;
  try {
    const query = 'SELECT id, nombre FROM discapacidad';
    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query);
    const options = results.map(result => ({
      value: result.id,
      label: result.nombre
    }));
    res.json(options);
  } catch (error) {
    console.error('Error al obtener datos de discapacidades:', error);
    res.status(500).json({ error: 'Error al obtener datos de discapacidades' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


app.post('/guardarAlergias', async (req, res) => {
  const { idAlumnos, opcionesAlergias } = req.body; // Recibir cicloEscolar y alumnos del cuerpo de la solicitud

  let connection;

  try {
    // Establecer conexión a la base de datos
    connection = await pool.getConnection();

    for (let i = 0; i < opcionesAlergias.length; i++) {
      const valor = opcionesAlergias[i];

      // Realizar la inserción en la tabla unicoAlergias
      const insertQuery = 'INSERT INTO unicoAlergias (idAlumno, valor,fecha_hora) VALUES (?, ?,NOW())';
      await connection.execute(insertQuery, [idAlumnos, valor]);

      console.log('Alergia', valor);
    }
  } catch (error) {
    console.error('Error al insertar valores en la tabla unicoAlergias:', error);
    res.status(500).send('Error al insertar valores en la tabla unicoAlergias');
    return;
  } finally {
    if (connection) {
      connection.release();
    }
  }

  res.status(200).send('Datos recibidos correctamente y alergias registrados en la base de datos');
});
app.post('/verificarAlergias', async (req, res) => {
  const { idAlumnos, opcionesAlergias } = req.body;
  let connection;
  let alergiasRegistradas = [];

  try {
    // Establecer conexión a la base de datos (asegúrate de tener pool definido)
    connection = await pool.getConnection();

    for (let i = 0; i < opcionesAlergias.length; i++) {
      const valor = opcionesAlergias[i];

      const existingDataQuery = `
          SELECT a.alergia AS nombre_alergia
          FROM unicoAlergias ua
          JOIN alergias a ON ua.valor = a.id
          WHERE ua.idAlumno = ? AND ua.valor = ?
      `;

      const [existingDataRows] = await connection.execute(existingDataQuery, [idAlumnos, valor]);

      if (existingDataRows.length > 0) {
        const nombreAlergia = existingDataRows[0].nombre_alergia; // Utilizar nombre_alergia en lugar de nombre
        console.log(`La alergia ${nombreAlergia} ya está registrada para el alumno ${idAlumnos}`);
        alergiasRegistradas.push(nombreAlergia);
      } else {
        console.log(`La alergia con ID ${valor} aún no está registrada para el alumno ${idAlumnos}`);
      }

    }

    if (alergiasRegistradas.length > 0) {
      res.status(200).json({ exists: true, alergiasRegistradas });
    } else {
      res.status(200).json({ exists: false });
    }

  } catch (error) {
    console.error('Error al verificar alergias:', error);
    res.status(500).send('Error al verificar alergias');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});



app.post('/guardarDiscapacidades', async (req, res) => {
  const { idAlumnos, opcionesDiscapacitados } = req.body;
  let connection;

  try {
    // Establecer conexión a la base de datos
    connection = await pool.getConnection();

    for (let i = 0; i < opcionesDiscapacitados.length; i++) {
      const valor = opcionesDiscapacitados[i];

      // Realizar la inserción en la tabla unicoDiscapa
      const insertQuery = 'INSERT INTO unicoDiscapa (idAlumno, valor,fecha_hora) VALUES (?, ?,NOW())';
      await connection.execute(insertQuery, [idAlumnos, valor]);

      console.log('Discapacidad', valor);
    }
  } catch (error) {
    console.error('Error al insertar valores en la tabla unicoDiscapa:', error);
    res.status(500).send('Error al insertar valores en la tabla unicoDiscapa');
    return;
  } finally {
    if (connection) {
      connection.release();
    }
  }
  res.status(200).send('Datos recibidos correctamente y discapacidades registrados en la base de datos');
});
app.post('/verificarDiscapacidades', async (req, res) => {
  const { idAlumnos, opcionesDiscapacitados } = req.body;
  let connection;
  let discapacidadesRegistradas = [];

  try {
    // Establecer conexión a la base de datos
    connection = await pool.getConnection();

    for (let i = 0; i < opcionesDiscapacitados.length; i++) {
      const valor = opcionesDiscapacitados[i];

      const existingDataQuery = `
              SELECT d.nombre AS nombre_discapacidad
              FROM unicoDiscapa u
              JOIN discapacidad d ON u.valor = d.id
              WHERE u.idAlumno = ? AND u.valor = ?
          `;
      const [existingDataRows] = await connection.execute(existingDataQuery, [idAlumnos, valor]);

      if (existingDataRows.length > 0) {
        const nombreDiscapacidad = existingDataRows[0].nombre_discapacidad;
        console.log(`La discapacidad ${nombreDiscapacidad} ya está registrada para el alumno ${idAlumnos}`);
        discapacidadesRegistradas.push(nombreDiscapacidad);
      } else {
        console.log(`La discapacidad con ID ${valor} aún no está registrada para el alumno ${idAlumnos}`);
      }
    }

    if (discapacidadesRegistradas.length > 0) {
      res.status(200).json({ exists: true, opcionesRegistradas: discapacidadesRegistradas });
    } else {
      res.status(200).json({ exists: false, opcionesRegistradas: [] });
    }

  } catch (error) {
    console.error('Error al verificar valores en la tabla unicoDiscapa:', error);
    res.status(500).send('Error al verificar valores en la tabla unicoDiscapa');
    return;
  } finally {
    if (connection) {
      connection.release();
    }
  }
});




app.post('/guardarVacunas', async (req, res) => {
  const { idAlumnos, opcionesVacunas } = req.body;
  let connection;

  try {
    // Establecer conexión a la base de datos
    connection = await pool.getConnection();

    for (let i = 0; i < opcionesVacunas.length; i++) {
      const valor = opcionesVacunas[i];

      // Realizar la inserción en la tabla unicoDiscapa
      const insertQuery = 'INSERT INTO unicoVacuna (idAlumno, valor,fecha_hora) VALUES (?, ?,NOW())';
      await connection.execute(insertQuery, [idAlumnos, valor]);

      console.log('Vacunas', valor);
    }
  } catch (error) {
    console.error('Error al insertar valores en la tabla unicoVacuna:', error);
    res.status(500).send('Error al insertar valores en la tabla unicoVacuna');
    return;
  } finally {
    if (connection) {
      connection.release();
    }
  }
  res.status(200).send('Datos recibidos correctamente y registrados en la base de datos');
});
app.post('/verificarVacunas', async (req, res) => {
  const { idAlumnos, opcionesVacunas } = req.body;
  let connection;
  let vacunasRegistradas = [];

  try {
    // Establecer conexión a la base de datos (asegúrate de tener pool definido)
    connection = await pool.getConnection();

    for (let i = 0; i < opcionesVacunas.length; i++) {
      const valor = opcionesVacunas[i];

      const existingDataQuery = `
          SELECT v.nombre AS nombre_vacuna
          FROM unicoVacuna u
          JOIN vacunas v ON u.valor = v.id
          WHERE u.idAlumno = ? AND u.valor = ?
      `;
      const [existingDataRows] = await connection.execute(existingDataQuery, [idAlumnos, valor]);

      if (existingDataRows.length > 0) {
        const nombreVacuna = existingDataRows[0].nombre_vacuna;
        console.log(`La vacuna ${nombreVacuna} ya está registrada para el alumno ${idAlumnos}`);
        vacunasRegistradas.push(nombreVacuna);
      } else {
        console.log(`La vacuna con ID ${valor} aún no está registrada para el alumno ${idAlumnos}`);
      }
    }

    if (vacunasRegistradas.length > 0) {
      res.status(200).json({ exists: true, opcionesRegistradas: vacunasRegistradas });
    } else {
      res.status(200).json({ exists: false, opcionesRegistradas: [] });
    }

  } catch (error) {
    console.error('Error al verificar valores en la tabla unicoVacuna:', error);
    res.status(500).send('Error al verificar valores en la tabla unicoVacuna');
    return;
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


app.get('/ConsultarUnicos/:idAlumno', async (req, res) => {
  const idAlumno = req.params.idAlumno;
  let connection;

  try {
    console.log('ID del alumno:', idAlumno);

    // Establecer conexión a la base de datos
    connection = await pool.getConnection();

    // Consultar alumnos con el mismo id en la tabla unicoAlergias y sus alergias correspondientes
    const query = `
      SELECT alergias.alergia
      FROM alergias
      JOIN unicoAlergias ON alergias.id = unicoAlergias.valor
      WHERE unicoAlergias.idAlumno = ?
    `;

    const [alergias] = await connection.execute(query, [idAlumno]);

    console.log('Alergias:', alergias);

    if (alergias.length === 0) {
      res.status(404).send("No se encontraron alergias para el ID de alumno proporcionado");
      return;
    }

    // Enviar los datos al frontend
    res.status(200).json(alergias);
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    res.status(500).send('Error al procesar la solicitud');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


app.get('/ConsultarDiscapacifdada/:idAlumno', async (req, res) => {
  const idAlumno = req.params.idAlumno;
  let connection;

  try {
    console.log('ID del alumno:', idAlumno);

    // Establecer conexión a la base de datos
    connection = await pool.getConnection();

    // Consultar discapacidades correspondientes al ID del alumno
    const query = `
    SELECT discapacidad.nombre
    FROM discapacidad
    JOIN unicoDiscapa ON discapacidad.id = unicoDiscapa.valor
    WHERE unicoDiscapa.idAlumno = ?
  `;

    const [discapacidad] = await connection.execute(query, [idAlumno]);

    console.log('Discapacidad:', discapacidad);

    if (discapacidad.length === 0) {
      res.status(404).send("No se encontraron discapacidades para el ID de alumno proporcionado");
      return;
    }

    // Enviar los datos al frontend
    res.status(200).json(discapacidad);
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    res.status(500).send('Error al procesar la solicitud');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});



app.get('/ConsultarVacunas/:idAlumno', async (req, res) => {
  const idAlumno = req.params.idAlumno;
  let connection;

  try {
    console.log('ID del alumno:', idAlumno);

    // Establecer conexión a la base de datos
    connection = await pool.getConnection();

    // Consultar el campo nombre de la tabla vacunas utilizando un JOIN
    const query = `
      SELECT vacunas.nombre
      FROM vacunas
      JOIN unicoVacuna ON vacunas.id = unicoVacuna.valor
      WHERE unicoVacuna.idAlumno = ?
    `;

    const [vacunas] = await connection.execute(query, [idAlumno]);

    console.log('Vacunas:', vacunas);

    if (vacunas.length === 0) {
      res.status(404).send("No se encontraron vacunas para el ID de alumno proporcionado");
      return;
    }

    // Enviar los datos al frontend
    res.status(200).json(vacunas);
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    res.status(500).send('Error al procesar la solicitud');
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.get('/ObtenerGruGra', async (req, res) => {
  const plantel = req.app.locals.plantel;
  const curp = req.app.locals.curp;
  let connection;
  let vacios = 0;
  let conDatos = 0;

  try {
    // Obtener una conexión del pool
    connection = await pool.getConnection();

    // Ejecutar la consulta SQL utilizando JOIN para unir las tablas
    const consulta = `
      SELECT asignacion_g.grado_id, asignacion_g.grupo_id, grupo.grupo, 
             (SELECT nombre FROM plantel WHERE id = ?) AS plantel_nombre
      FROM asignacion_g 
      INNER JOIN grupo ON asignacion_g.grupo_id = grupo.id 
      WHERE asignacion_g.docente_curp = ?
    `;
    const [resultado] = await connection.query(consulta, [plantel, curp]);

    // Mapear los resultados para incluir la curp en cada objeto
    const resultadosConCurp = resultado.map(item => ({
      curp: curp,
      grado_id: item.grado_id,
      grupo_id: item.grupo_id,
      grupo: item.grupo,
      plantel_nombre: item.plantel_nombre
    }));

    // Almacenar todos los datos de alumnos y salud
    const datosCompletos = [];

    // Iterar sobre los resultados para ejecutar las consultas para cada uno
    for (const resultado of resultadosConCurp) {
      const consultaAlumnos = `
        SELECT idAlumnos, sexo
        FROM alumnos
        WHERE docente_curp = ? AND grado_id = ? AND grupo_id = ?
      `;
      const [alumnos] = await connection.query(consultaAlumnos, [curp, resultado.grado_id, resultado.grupo_id]);
      console.log(`Datos de alumnos para curp ${curp}, grado_id ${resultado.grado_id} y grupo_id ${resultado.grupo_id}:`, alumnos);

      // Almacenar datos de alumnos
      datosCompletos.push({

        resultadosConCurp: {
          curp: curp,
          grado_id: resultado.grado_id,
          grupo_id: resultado.grupo_id,
          grupo: resultado.grupo,
          plantel_nombre: resultado.plantel_nombre
        },
        alumnos: alumnos,
      });

      // Consultar la tabla unicoAlergias para obtener los valores reales de las alergias
      for (const alumno of alumnos) {
        const consultaAlergias = `
    SELECT alergias.alergia
    FROM unicoAlergias
    INNER JOIN alergias ON unicoAlergias.valor = alergias.id
    WHERE unicoAlergias.idAlumno = ?
  `;
        const [alergias] = await connection.query(consultaAlergias, [alumno.idAlumnos]);
        console.log(`Alergias para idAlumnos ${alumno.idAlumnos}:`, alergias);

        // Almacenar datos de alergias
        datosCompletos.push({
          alumno: alumno,
          alergias: alergias
        });
      }



      // Consultar la tabla unicoDiscapacidad para obtener los valores reales de las discapacidades
      for (const alumno of alumnos) {
        const consultaDiscapacidad = `
    SELECT discapacidad.nombre
    FROM unicoDiscapa
    INNER JOIN discapacidad ON unicoDiscapa.valor = discapacidad.id
    WHERE unicoDiscapa.idAlumno = ?
  `;
        const [discapacidad] = await connection.query(consultaDiscapacidad, [alumno.idAlumnos]);
        console.log(`Discapacidad para idAlumnos ${alumno.idAlumnos}:`, discapacidad);

        // Almacenar datos de discapacidad
        datosCompletos.push({
          alumno: alumno,
          discapacidad: discapacidad
        });
      }


      // Consultar la tabla unicoVacuna para obtener los valores reales de las vacunas
      for (const alumno of alumnos) {
        const consultaVacunas = `
    SELECT vacunas.nombre
    FROM unicoVacuna
    INNER JOIN vacunas ON unicoVacuna.valor = vacunas.id
    WHERE unicoVacuna.idAlumno = ?
  `;
        const [vacunas] = await connection.query(consultaVacunas, [alumno.idAlumnos]);
        console.log(`Vacunas para idAlumnos ${alumno.idAlumnos}:`, vacunas);

        // Almacenar datos de vacunas
        datosCompletos.push({
          alumno: alumno,
          vacunas: vacunas
        });
      }

      // Consulta en la tabla saludAlum
      for (const alumno of alumnos) {
        const consultaSalud = `
          SELECT Categorias.nombre AS categoria, saludAlum.valor
          FROM saludAlum
          INNER JOIN Categorias ON saludAlum.idCategoria = Categorias.id
          WHERE saludAlum.idAlumno = ?
        `;
        const [salud] = await connection.query(consultaSalud, [alumno.idAlumnos]);
        console.log(`Datos de salud para idAlumnos ${alumno.idAlumnos}:`, salud);

        // Almacenar datos de salud
        datosCompletos.push({ salud: salud });

        // Verificar si los datos de salud están vacíos o no
        if (salud.length === 0) {
          vacios++;
        } else {
          conDatos++;
        }
      }
    }

    // Enviar todos los datos como respuesta
    res.json(datosCompletos);

    // Enviar la cuenta de datos de salud vacíos y con datos
    console.log(`Datos de salud vacíos: ${vacios}`);
    console.log(`Datos de salud con información: ${conDatos}`);

  } catch (error) {
    // Manejar cualquier error
    console.error('Error al ejecutar la consulta:', error);
    res.status(500).send('Error interno del servidor');

  } finally {
    // Asegurarse de liberar la conexión después de su uso
    if (connection) {
      connection.release();
    }
  }
});




app.get('/consultarActividades', async (req, res) => {
  let connection;
  try {
    const query = 'SELECT * FROM agenda';
    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query);
    res.json(results);
  } catch (error) {
    console.error('Error al obtener actividades:', error);
    res.status(500).json({ error: 'Error al obtener actividades' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

 


app.get('/consultarActividadesId', async (req, res) => {
  const roleName = req.app.locals.roleName;

  let connection;
  console.log('user', roleName);
  try {
    const query = 'SELECT * FROM agenda WHERE tipo_asig = ?';
    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query, [roleName]);
    res.json(results);
  } catch (error) {
    console.error('Error al obtener actividades:', error);
    res.status(500).json({ error: 'Error al obtener actividades' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});





app.post('/guardarAgenda', async (req, res) => {
  let connection;

  try {
    const { titulo, descripcion, asignacion, fecha, hora } = req.body;
    console.log('Datos recibidos para la agenda:', { titulo, descripcion, asignacion, fecha, hora });
    connection = await req.mysqlPool.getConnection();
    const query ='INSERT INTO agenda ( titulo, descripcion, tipo_asig, fecha_sol, hora_sol, fecha_creacion) VALUES (?,?,?,?,?, NOW())'; 
    await connection.query(query, [titulo, descripcion, asignacion, fecha, hora]);
    console.log('Datos insertados correctamente a la agenda'); 
    res.json({ success: true, message: 'Datos insertados correctamente a la agenda' });
  } catch (error) {
    console.error('Error al procesar la solicitud: ', error);
    res.status(500).json({ success: false, message: 'Error al procesar la solicitud' });
  } finally {
    if (connection) {
      connection.release(); 
    }
  }
});


 

// Ruta para manejar la subida del archivo desde el frontend
app.post('/subirPdf', upload.single('file'), async (req, res) => {
  let connection;
  const curp = req.app.locals.curp
  if (!req.file) {
    return res.status(400).json({ message: 'No se subió ningún archivo' });
  }
  const localFilePath = path.join(__dirname, 'uploads', req.file.filename);
  const fileContent = fs.readFileSync(localFilePath);

  try {
    connection = await pool.getConnection();

    // Insertar archivo en la tabla evidenciasPDF
    await connection.query("INSERT INTO evidenciasPDF (id_agenda, pdf, curp) VALUES (?, ?, ?)", [req.body.actividadId, fileContent, curp]);
    console.log('Archivo PDF subido exitosamente a la tabla evidenciasPDF');

    // Borrar el archivo temporal después de subirlo a la base de datos
    fs.unlinkSync(localFilePath);

    res.json({ message: 'Archivo PDF subido exitosamente' });
  } catch (error) {
    console.error('Error al subir el archivo PDF a la tabla evidenciasPDF:', error);
    res.status(500).json({ message: 'Error al subir el archivo PDF' });
  } finally {
    if (connection) {
      connection.release(); // Liberar la conexión
    }
  }
});



app.get('/verificarExistencia/:actividadId', async (req, res) => {
  const actividadId = req.params.actividadId;
  const curp = req.app.locals.curp
  let connection;
  try {
    connection = await pool.getConnection();

    // Consultar si existe un registro con el id_agenda y curp dados
    const query = "SELECT COUNT(*) AS count FROM evidenciasPDF WHERE id_agenda = ? AND curp = ?";
    const [rows] = await connection.query(query, [actividadId, curp]);

    // Devolver true si hay al menos un registro
    res.json({ existe: rows[0].count > 0 });
  } catch (error) {
    console.error('Error al verificar la existencia en evidenciasPDF:', error);
    res.status(500).json({ error: 'Error al verificar la existencia' });
  } finally {
    if (connection) {
      connection.release(); // Liberar la conexión
    }
  }
});



app.get('/ConcultarevidenciasPDF', async (req, res) => {
  let connection;
  const curp = req.app.locals.curp;
  try {
    // Consulta SQL con JOIN para obtener la descripción de la agenda
    const query = `
      SELECT 
        e.id,
        e.id_agenda,
        a.descripcion AS descripcion_agenda
      FROM 
        evidenciasPDF e
      JOIN 
        agenda a ON e.id_agenda = a.id
      WHERE 
        e.curp = ?
    `;
    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query, [curp]);
    res.json(results);
  } catch (error) {
    console.error('Error al obtener actividades:', error);
    res.status(500).json({ error: 'Error al obtener actividades' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.delete('/eliminarEvidencia/:id', async (req, res) => {
  let connection;
  const { id } = req.params;
  try {
    const query = 'DELETE FROM evidenciasPDF WHERE id = ?';
    connection = await req.mysqlPool.getConnection();
    await connection.execute(query, [id]);
    res.json({ message: 'Actividad eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar actividad:', error);
    res.status(500).json({ error: 'Error al eliminar actividad' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


 

app.get('/descargarEvidencia/:id', async (req, res) => {
  let connection;
  const { id } = req.params;
  try {
    connection = await req.mysqlPool.getConnection();
    const [rows] = await connection.execute('SELECT pdf FROM evidenciasPDF WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Evidencia no encontrada' });
    }

    const pdfBuffer = rows[0].pdf;

    res.setHeader('Content-Disposition', `attachment; filename=evidencia_${id}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error al descargar evidencia:', error);
    res.status(500).json({ message: 'Error al descargar evidencia' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});
 


app.post('/guardar-rezago-academico', async (req, res) => {
  let connection;
  const {
    idAlumnos, 
    leer,
    escribir,
    habilidad,
    participacion,
    comportamiento
  } = req.body;

  try {
    // Establecer conexión desde el pool
    connection = await pool.getConnection();

    // Consulta SQL para insertar todos los datos en la tabla rezagoAlumno
    const query = `
      INSERT INTO rezagoAlumno (idAlumnos, habilidad_lectura, habilidad_escritura, habilidad_matematica, participacion, comportamiento)
      VALUES (?, ?, ?, ?, ?, ?)`;

    // Ejecutar la consulta SQL con los parámetros proporcionados
    await connection.execute(query, [idAlumnos, leer, escribir, habilidad, participacion, comportamiento]);

    // Enviar respuesta de éxito al cliente
    res.status(200).json({ message: 'Datos de rezago académico guardados correctamente' });

  } catch (error) {
    // Manejo de errores
    console.error('Error al guardar datos de rezago académico:', error);
    res.status(500).json({ error: 'Error al guardar datos de rezago académico' });

  } finally {
    // Liberar la conexión al pool, independientemente del resultado
    if (connection) {
      connection.release();
    }
  }
});



 
app.get('/rezagoAlumno', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rezagoRows] = await connection.execute(`
      SELECT *
      FROM rezagoAlumno
    `);
    if (rezagoRows.length === 0) {
      return res.status(404).json({ error: 'No se encontraron datos en la tabla rezagoAlumno' });
    } 
    res.json(rezagoRows);
  } catch (error) {
    console.error('Error en la consulta SQL:', error);
    res.status(500).json({ error: 'Error en la consulta SQL' });
  } finally { 
    if (connection) {
      connection.release();
    }
  }
});

app.get('/verificar-rezago/:idAlumnos', async (req, res) => {
  let connection;
  const { idAlumnos } = req.params;

  try {
    connection = await pool.getConnection();
    const query = `
      SELECT * FROM rezagoAlumno WHERE idAlumnos = ?`;
    const [result] = await connection.execute(query, [idAlumnos]);

    if (result.length > 0) {
      return res.status(200).json({ existe: true });
    }

    res.status(200).json({ existe: false });

  } catch (error) {
    console.error('Error en la consulta SQL:', error);
    res.status(500).json({ error: 'Error al verificar el registro de rezago académico' });

  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.put('/rezagoAlumno/:idAlumnos', async (req, res) => {
  let connection;
  const { idAlumnos } = req.params;
  const { habilidad_lectura, habilidad_escritura, habilidad_matematica, participacion, comportamiento } = req.body;

  try {
    connection = await pool.getConnection();

    const query = `
      UPDATE rezagoAlumno
      SET habilidad_lectura = ?, habilidad_escritura = ?, habilidad_matematica = ?, participacion = ?, comportamiento = ?
      WHERE idAlumnos = ?`;

    await connection.execute(query, [habilidad_lectura, habilidad_escritura, habilidad_matematica, participacion, comportamiento, idAlumnos]);

    res.status(200).json({ message: 'Registro actualizado correctamente' });

  } catch (error) {
    console.error('Error al actualizar el registro:', error);
    res.status(500).json({ error: 'Error al actualizar el registro' });

  } finally {
    if (connection) {
      connection.release();
    }
  }
});


app.delete('/rezagoAlumno/:idAlumnos', async (req, res) => {
  let connection;
  const { idAlumnos } = req.params;

  try {
    connection = await pool.getConnection();

    const query = `DELETE FROM rezagoAlumno WHERE idAlumnos = ?`;

    await connection.execute(query, [idAlumnos]);

    res.status(200).json({ message: 'Registro eliminado correctamente' });

  } catch (error) {
    console.error('Error al eliminar el registro:', error);
    res.status(500).json({ error: 'Error al eliminar el registro' });

  } finally {
    if (connection) {
      connection.release();
    }
  }
});




app.get('/consultarPDF', async (req, res) => {
  let connection;
  try {
    const query = `
      SELECT e.id_agenda, e.curp, e.pdf, a.titulo
      FROM evidenciasPDF AS e
      INNER JOIN agenda AS a ON e.id_agenda = a.id
    `;
    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query);
    res.json(results);
  } catch (error) {
    console.error('Error al obtener pdf:', error);
    res.status(500).json({ error: 'Error al obtener pdf' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});



app.get('/getMaterias', async (req, res) => {
  let connection;
  try {
    const query = 'SELECT id, nombre FROM materias';
    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query);
    
    // Asegúrate de que la respuesta sea un array de objetos con `value` y `label`
    const options = results.map(result => ({
      value: result.id, // El valor que se usará en el Select
      label: result.nombre // El texto que se mostrará en el Select
    }));
    
    res.json(options);
  } catch (error) {
    console.error('Error al obtener datos :', error);
    res.status(500).json({ error: 'Error al obtener datos' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.post('/submitExamen', upload.single('file'), async (req, res) => {
  let connection;
  const curp = req.app.locals.curp;
  const now = new Date();
  const fecha = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const hora = now.toTimeString().split(' ')[0]; // HH:MM:SS
  const { opcion, descripcion  } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: 'No se subió ningún archivo' });
  }

  const localFilePath = path.join(__dirname, 'uploads', req.file.filename);
  const fileContent = fs.readFileSync(localFilePath);

  try {
    connection = await pool.getConnection();
    await connection.query(
      "INSERT INTO examen (curp, hora, fecha, materia, pdf, descripcion) VALUES (?, ?, ?, ?, ?, ?)",
      [curp, hora, fecha, opcion, fileContent,descripcion]
    );
    console.log('Archivo PDF subido exitosamente a la tabla examen');

    // Borrar el archivo temporal después de subirlo a la base de datos
    fs.unlinkSync(localFilePath);

    res.json({ message: 'Archivo PDF subido exitosamente' });
  } catch (error) {
    console.error('Error al subir el archivo PDF a la tabla examen:', error);
    res.status(500).json({ message: 'Error al subir el archivo PDF' });
  } finally {
    if (connection) {
      connection.release(); // Liberar la conexión
    }
  }
});

app.get('/consultarMaterias', async (req, res) => {
  let connection;
  try {
    const query = `
      SELECT e.id, e.curp, e.hora, e.fecha, m.nombre AS materia, e.pdf, e.descripcion
      FROM examen e
      JOIN materias m ON e.materia = m.id
    `;
    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query);
    res.json(results);
  } catch (error) {
    console.error('Error al obtener datos:', error);
    res.status(500).json({ error: 'Error al obtener datos' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});
 


app.post('/guardarForo', async (req, res) => {
  let connection;
  const curp = req.app.locals.curp;

  try {
    const { id, opinion, fecha, hora } = req.body;

    console.log('Datos recibidos para el foro:', {  id, opinion, fecha, hora });
    connection = await req.mysqlPool.getConnection();
    const query ='INSERT INTO foro ( id_examen, curp, opinion, fecha, hora) VALUES (?,?,?,?,?)'; 
    await connection.query(query, [ id, curp, opinion, fecha, hora]);
    console.log('Datos insertados correctamente al foro'); 
    res.json({ success: true, message: 'Datos insertados correctamente al foro' });
  } catch (error) {
    console.error('Error al procesar la solicitud: ', error);
    res.status(500).json({ success: false, message: 'Error al procesar la solicitud' });
  } finally {
    if (connection) {
      connection.release(); 
    }
  }
});


 
app.get('/foro', async (req, res) => {
  let connection;
  try {
    const query = `
      SELECT * FROM foro
    `;
    connection = await req.mysqlPool.getConnection();
    const [results] = await connection.execute(query);
    res.json(results);
  } catch (error) {
    console.error('Error al obtener datos:', error);
    res.status(500).json({ error: 'Error al obtener datos' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});
 


app.get('/getPdf', async (req, res) => {
  const { id } = req.query; // Obtén el id desde los parámetros de consulta

  if (!id) {
    return res.status(400).json({ error: 'Falta el parámetro id' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    
    const query = `
      SELECT pdf
      FROM examen
      WHERE id = ?
    `;
    
    const [rows] = await connection.execute(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'PDF no encontrado' });
    }

    const pdf = rows[0].pdf;

    // Establece el tipo de contenido adecuado para un archivo PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdf);
  } catch (error) {
    console.error('Error al obtener el PDF:', error);
    res.status(500).json({ error: 'Error al obtener el PDF' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


app.delete('/eliminarComentario/:id', async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const query = `DELETE FROM foro WHERE id = ?`;
    connection = await req.mysqlPool.getConnection();
    const [result] = await connection.execute(query, [id]);
    
    if (result.affectedRows > 0) {
      res.json({ message: 'Comentario eliminado correctamente.' });
    } else {
      res.status(404).json({ error: 'Comentario no encontrado.' });
    }
  } catch (error) {
    console.error('Error al eliminar comentario:', error);
    res.status(500).json({ error: 'Error al eliminar comentario' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.put('/actualizarComentario', async (req, res) => {
  let connection;
  try {
    const { id, opinion } = req.body; // Obtener los datos del cuerpo de la solicitud

    // Verificar que se recibieron todos los datos necesarios
    if (!id || !opinion) {
      return res.status(400).json({ error: 'Faltan datos en la solicitud' });
    }

    const query = `UPDATE foro SET opinion = ? WHERE id = ?`;
    connection = await req.mysqlPool.getConnection();
    const [result] = await connection.execute(query, [opinion, id]);

    if (result.affectedRows > 0) {
      res.json({ message: 'Comentario actualizado correctamente.' });
    } else {
      res.status(404).json({ error: 'Comentario no encontrado.' });
    }
  } catch (error) {
    console.error('Error al actualizar comentario:', error);
    res.status(500).json({ error: 'Error al actualizar comentario' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

 
app.listen(PORT, () => {
  console.log(`Servidor en ejecución en el puerto ${PORT}`);
});
