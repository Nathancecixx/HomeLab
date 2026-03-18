import type { Pool } from "pg";

import { getDefaultEnabledModules } from "../config.js";
import { DATA_HUB_SCHEMA_SQL } from "./schema.js";

export async function ensureDataHubSchema(pool: Pool) {
  await pool.query(DATA_HUB_SCHEMA_SQL);
  await pool.query(
    `INSERT INTO app_settings (setting_key, setting_value)
     VALUES ('enabled_modules', $1::jsonb)
     ON CONFLICT (setting_key) DO NOTHING`,
    [JSON.stringify(getDefaultEnabledModules())],
  );
}
