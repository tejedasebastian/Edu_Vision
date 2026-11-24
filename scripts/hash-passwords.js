// scripts/hash-passwords.js
// Migra contraseñas heredadas en texto plano a hashes bcrypt.
// Uso: npm run db:hash-passwords (requiere las variables MYSQL* en .env)

require('dotenv').config();

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
  host: process.env.MYSQLHOST || 'localhost',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'sistema_cursos',
  port: process.env.MYSQLPORT ? parseInt(process.env.MYSQLPORT, 10) : 3306
};

async function main() {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const [rows] = await connection.execute(
      "SELECT id_usuario, contraseña FROM usuario WHERE contraseña IS NOT NULL AND LEFT(contraseña, 2) <> '$2'"
    );

    if (rows.length === 0) {
      console.log('✓ No hay contraseñas en texto plano. Nada que migrar.');
      return;
    }

    let migrated = 0;
    for (const row of rows) {
      if (!row['contraseña']) continue;
      const hash = await bcrypt.hash(String(row['contraseña']), 12);
      await connection.execute(
        'UPDATE usuario SET contraseña = ? WHERE id_usuario = ?',
        [hash, row.id_usuario]
      );
      migrated += 1;
    }

    console.log(`✓ ${migrated} contraseña(s) migrada(s) a bcrypt.`);
    console.log('⚠️  Si esas contraseñas eran de ejemplo, cámbialas por contraseñas fuertes.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('✗ Error al migrar contraseñas:', error.message);
  process.exit(1);
});
