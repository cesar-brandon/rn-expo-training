import { SQLiteDatabase } from "expo-sqlite";

export type UserVersion = {
  user_version: number;
};

const CURRENT_DB_VERSION = 4; // Incrementa este número cada vez que agregues una nueva migración

/**
 * Función para obtener la versión actual de la base de datos.
 * @param db - Instancia de SQLiteDatabase
 * @returns Versión actual de la base de datos
 */
async function getCurrentDbVersion(db: SQLiteDatabase): Promise<number> {
  try {
    const result = await db.getFirstAsync<UserVersion>("PRAGMA user_version");
    console.log("Resultado de PRAGMA user_version:", result);
    return result?.user_version ?? 0;
  } catch (error) {
    console.error("Error al obtener la versión de la base de datos:", error);
    return 0; // O un valor por defecto en caso de error
  }
}

/**
 * Función principal para aplicar migraciones en orden.
 * @param db - Instancia de SQLiteDatabase
 */
async function migrateDbIfNeeded(db: SQLiteDatabase) {
  try {
    const currentDbVersion = await getCurrentDbVersion(db);

    if (currentDbVersion < CURRENT_DB_VERSION) {
      console.log(
        `Iniciando migración de la base de datos: Versión ${currentDbVersion} -> ${CURRENT_DB_VERSION}`,
      );

      // Cambiar el modo de diario a WAL fuera de la transacción
      if (currentDbVersion === 0) {
        await db.execAsync(`PRAGMA journal_mode = WAL;`);
      }

      await db.withTransactionAsync(async () => {
        for (
          let version = currentDbVersion + 1;
          version <= CURRENT_DB_VERSION;
          version++
        ) {
          console.log(`Aplicando migración para la versión ${version}...`);
          await applyMigration(db, version);
        }

        // Actualizar la versión de la base de datos al valor más reciente
        await db.execAsync(`PRAGMA user_version = ${CURRENT_DB_VERSION}`);
        console.log(
          `Migración completada: Base de datos actualizada a la versión ${CURRENT_DB_VERSION}`,
        );
      });
    } else {
      console.log(
        "No se requieren migraciones: La base de datos está actualizada.",
      );
    }
  } catch (error) {
    console.error("Error durante la migración de la base de datos:", error);
  }
}

/**
 * Aplica las migraciones específicas para una versión.
 * @param db - Instancia de SQLiteDatabase
 * @param version - Número de la versión a migrar
 */
async function applyMigration(db: SQLiteDatabase, version: number) {
  switch (version) {
    case 1:
      await db.execAsync(`
        CREATE TABLE users (
          id_usuario TEXT PRIMARY KEY,
          usuario_nombres TEXT,
          usuario_apater TEXT,
          usuario_amater TEXT,
          usuario_codigo TEXT,
          usuario_password TEXT,
          password_desencriptado TEXT NOT NULL,
          id_nivel INTEGER
        );
 
        CREATE TABLE beneficiario (
          id_beneficiario INTEGER PRIMARY KEY AUTOINCREMENT,
          id_padron INTEGER,
          id_adenda INTEGER,
          id_caserio INTEGER,
          codigo TEXT,
          oz TEXT,
          ambito TEXT,
          departamento TEXT,
          provincia TEXT,
          distrito TEXT,
          caserio TEXT,
          ape_paterno TEXT,
          ape_materno TEXT,
          nombre TEXT,
          nro_documento TEXT,
          sexo TEXT,
          etnia TEXT,
          lengua TEXT,
          telefono TEXT,
          fec_nac DATE,
          edad INTEGER,
          anio_incorporacion INTEGER,
          observacion TEXT,
          justificacion TEXT,
          estado INTEGER NOT NULL DEFAULT 0,
          fec_reg DATETIME,
          user_reg INTEGER,
          fec_act DATETIME,
          user_act INTEGER,
          fec_eli DATETIME,
          user_eli INTEGER
        );

        CREATE TABLE modulo_subgrupo (
          id_modulo_subgrupo INTEGER PRIMARY KEY AUTOINCREMENT,
          id_modulo_grupo INTEGER NOT NULL,
          nom_subgrupo TEXT NOT NULL,
          nom_menu TEXT NOT NULL,
          url TEXT,
          id_proyecto INTEGER NOT NULL DEFAULT 0,
          fecha_ini DATE,
          fecha_fin DATE,
          codigo TEXT,
          actividad INTEGER NOT NULL DEFAULT 0,
          estado INTEGER,
          fec_reg DATETIME,
          user_reg INTEGER,
          fec_act DATETIME,
          user_act INTEGER,
          fec_eli DATETIME,
          user_eli INTEGER
        );

        CREATE TABLE modulo_subgrupo_xnivel (
          id_modulo_subgrupo_n INTEGER PRIMARY KEY AUTOINCREMENT,
          id_modulo_subgrupo INTEGER NOT NULL,
          id_nivel INTEGER NOT NULL,
          id_modulo_grupo INTEGER NOT NULL,
          estado INTEGER,
          fec_reg DATETIME,
          user_reg INTEGER,
          fec_act DATETIME,
          user_actu INTEGER,
          fec_eli DATETIME,
          user_eli INTEGER
        );

        CREATE TABLE actividad (
          id_actividad INTEGER PRIMARY KEY AUTOINCREMENT,
          cod_actividad TEXT,
          nom_actividad TEXT,
          fecha_ini DATE,
          fecha_fin DATE,
          id_proyecto INTEGER DEFAULT 0,
          estado INTEGER,
          fec_reg DATETIME,
          user_reg INTEGER,
          fec_act DATETIME,
          user_act INTEGER,
          fec_eli DATETIME,
          user_eli INTEGER
        );

        CREATE TABLE actividad_detalle (
          id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
          id_actividad INTEGER DEFAULT 0,
          nom_tabla TEXT,
          estado INTEGER,
          fec_reg DATETIME,
          user_reg INTEGER,
          fec_act DATETIME,
          user_act INTEGER,
          fec_eli DATETIME,
          user_eli INTEGER
        );

        CREATE TABLE actividad_detalle_campos (
          id_detalle_campo INTEGER PRIMARY KEY AUTOINCREMENT,
          id_detalle INTEGER DEFAULT 0,
          id_actividad INTEGER DEFAULT 0,
          nom_campo TEXT,
          nom_etiqueta TEXT,
          titulo_etiqueta TEXT,
          tam_etiqueta TEXT,
          tipo_campo TEXT,
          tam_campo TEXT,
          num_fila INTEGER DEFAULT 0,
          flag_input TEXT,
          orden_label INTEGER NOT NULL DEFAULT 0,
          estado INTEGER,
          fec_reg DATETIME,
          user_reg INTEGER,
          fec_act DATETIME,
          user_act INTEGER,
          fec_eli DATETIME,
          user_eli INTEGER
        );
      `);

      break;

    case 2:
      await db.execAsync(`
        CREATE TABLE mae_combo (
          id_mae_combo INTEGER PRIMARY KEY AUTOINCREMENT,
          nom_mae_combo TEXT DEFAULT NULL,
          nom_camp_mae_combo TEXT NOT NULL,
          mae_combo INTEGER NOT NULL DEFAULT 0,
          id_actividad INTEGER NOT NULL DEFAULT 0,
          actividad INTEGER NOT NULL DEFAULT 0,
          estado INTEGER DEFAULT NULL,
          fec_reg TEXT DEFAULT NULL,
          user_reg INTEGER DEFAULT NULL,
          fec_act TEXT DEFAULT NULL,
          user_act INTEGER DEFAULT NULL,
          fec_eli TEXT DEFAULT NULL,
          user_eli INTEGER DEFAULT NULL
        );

        CREATE TABLE mae_combo_detalle (
          id_mae_combo_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
          id_mae_combo INTEGER NOT NULL,
          nom_mae_combo_detalle TEXT DEFAULT NULL,
          nom_camp_mae_combo_detalle TEXT NOT NULL,
          estado INTEGER DEFAULT NULL,
          fec_reg TEXT DEFAULT NULL,
          user_reg INTEGER DEFAULT NULL,
          fec_act TEXT DEFAULT NULL,
          user_act INTEGER DEFAULT NULL,
          fec_eli TEXT DEFAULT NULL,
          user_eli INTEGER DEFAULT NULL
        );
      `);
      break;

    case 3:
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_log (
          id_log INTEGER PRIMARY KEY AUTOINCREMENT,
          tabla TEXT NOT NULL,
          tipo_operacion TEXT NOT NULL,
          id_app TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          estado_sync INTEGER NOT NULL
        );
      `);
      break;

    case 4:
      await db.execAsync(`
          CREATE TABLE IF NOT EXISTS caserio (
            id_caserio INTEGER PRIMARY KEY AUTOINCREMENT,
            nom_caserio TEXT DEFAULT NULL,
            estado INTEGER DEFAULT NULL,
            fec_reg DATETIME DEFAULT NULL,
            user_reg INTEGER DEFAULT NULL,
            fec_act DATETIME DEFAULT NULL,
            user_act INTEGER DEFAULT NULL,
            fec_eli DATETIME DEFAULT NULL,
            user_eli INTEGER DEFAULT NULL
          );
        `);
      break;

    // Agrega más migraciones para versiones futuras aquí
    default:
      console.warn(`No hay migraciones definidas para la versión ${version}`);
  }
}

export { migrateDbIfNeeded };
