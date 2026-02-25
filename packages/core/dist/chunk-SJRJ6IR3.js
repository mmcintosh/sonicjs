import { __export } from './chunk-V4OQ3NZ2.js';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { z } from 'zod/v4';
import { getTableColumns, getViewSelectedFields, isTable, is, Column, SQL, isView, eq, inArray, like, gte, lte, and, count, asc, desc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

// src/services/collection-loader.ts
var registeredCollections = [];
function registerCollections(collections2) {
  for (const config of collections2) {
    if (!config.name || !config.displayName || !config.schema) {
      console.error(`Invalid collection config: missing required fields`, config);
      continue;
    }
    const normalizedConfig = {
      ...config,
      managed: config.managed !== void 0 ? config.managed : true,
      isActive: config.isActive !== void 0 ? config.isActive : true
    };
    registeredCollections.push(normalizedConfig);
    console.log(`\u2713 Registered collection: ${config.name}`);
  }
}
async function loadCollectionConfigs() {
  const collections2 = [...registeredCollections];
  if (registeredCollections.length > 0) {
    console.log(`\u{1F4E6} Found ${registeredCollections.length} registered collection(s) from application`);
  } else {
    console.log(`\u26A0\uFE0F  No collections registered. Make sure to call registerCollections() in your app's index.ts`);
    console.log(`   Example: import myCollection from './collections/my-collection.collection'`);
    console.log(`            registerCollections([myCollection])`);
  }
  try {
    const modules = import.meta.glob?.("../collections/*.collection.ts", { eager: true }) || {};
    let coreCollectionCount = 0;
    for (const [path, module] of Object.entries(modules)) {
      try {
        const configModule = module;
        if (!configModule.default) {
          console.warn(`Collection file ${path} does not export a default config`);
          continue;
        }
        const config = configModule.default;
        if (!config.name || !config.displayName || !config.schema) {
          console.error(`Invalid collection config in ${path}: missing required fields`);
          continue;
        }
        const normalizedConfig = {
          ...config,
          managed: config.managed !== void 0 ? config.managed : true,
          isActive: config.isActive !== void 0 ? config.isActive : true
        };
        collections2.push(normalizedConfig);
        coreCollectionCount++;
        console.log(`\u2713 Loaded core collection: ${config.name}`);
      } catch (error) {
        console.error(`Error loading collection from ${path}:`, error);
      }
    }
    console.log(`\u{1F4CA} Collection summary: ${collections2.length} total (${registeredCollections.length} from app, ${coreCollectionCount} from core)`);
    return collections2;
  } catch (error) {
    console.error("Error loading collection configurations:", error);
    return collections2;
  }
}
async function loadCollectionConfig(name) {
  try {
    console.warn("loadCollectionConfig requires implementation in consuming application");
    return null;
  } catch (error) {
    console.error(`Error loading collection ${name}:`, error);
    return null;
  }
}
async function getAvailableCollectionNames() {
  try {
    const modules = import.meta.glob?.("../collections/*.collection.ts") || {};
    const names = [];
    for (const path of Object.keys(modules)) {
      const match = path.match(/\/([^/]+)\.collection\.ts$/);
      if (match && match[1]) {
        names.push(match[1]);
      }
    }
    return names;
  } catch (error) {
    console.error("Error getting collection names:", error);
    return [];
  }
}
function validateCollectionConfig(config) {
  const errors = [];
  if (!config.name) {
    errors.push("Collection name is required");
  } else if (!/^[a-z0-9_-]+$/.test(config.name)) {
    errors.push("Collection name must contain only lowercase letters, numbers, underscores, and hyphens");
  }
  if (!config.displayName) {
    errors.push("Display name is required");
  }
  if (!config.schema) {
    errors.push("Schema is required");
  } else {
    if (config.schema.type !== "object") {
      errors.push('Schema type must be "object"');
    }
    if (!config.schema.properties || typeof config.schema.properties !== "object") {
      errors.push("Schema must have properties");
    }
    for (const [fieldName, fieldConfig] of Object.entries(config.schema.properties || {})) {
      if (!fieldConfig.type) {
        errors.push(`Field "${fieldName}" is missing type`);
      }
      if (fieldConfig.type === "reference" && !fieldConfig.collection) {
        errors.push(`Reference field "${fieldName}" is missing collection property`);
      }
      if (["select", "multiselect", "radio"].includes(fieldConfig.type) && !fieldConfig.enum) {
        errors.push(`Select field "${fieldName}" is missing enum options`);
      }
    }
  }
  return {
    valid: errors.length === 0,
    errors
  };
}

// src/services/collection-sync.ts
async function syncCollections(db) {
  console.log("\u{1F504} Starting collection sync...");
  const results = [];
  const configs = await loadCollectionConfigs();
  if (configs.length === 0) {
    console.log("\u26A0\uFE0F  No collection configurations found");
    return results;
  }
  for (const config of configs) {
    const result = await syncCollection(db, config);
    results.push(result);
  }
  const created = results.filter((r) => r.status === "created").length;
  const updated = results.filter((r) => r.status === "updated").length;
  const unchanged = results.filter((r) => r.status === "unchanged").length;
  const errors = results.filter((r) => r.status === "error").length;
  console.log(`\u2705 Collection sync complete: ${created} created, ${updated} updated, ${unchanged} unchanged, ${errors} errors`);
  return results;
}
async function syncCollection(db, config) {
  try {
    const validation = validateCollectionConfig(config);
    if (!validation.valid) {
      return {
        name: config.name,
        status: "error",
        error: `Validation failed: ${validation.errors.join(", ")}`
      };
    }
    const existingStmt = db.prepare("SELECT * FROM collections WHERE name = ?");
    const existing = await existingStmt.bind(config.name).first();
    const now = Date.now();
    const collectionId = existing?.id || `col-${config.name}-${crypto.randomUUID().slice(0, 8)}`;
    const schemaJson = JSON.stringify(config.schema);
    const isActive = config.isActive !== false ? 1 : 0;
    const managed = config.managed !== false ? 1 : 0;
    if (!existing) {
      const insertStmt = db.prepare(`
        INSERT INTO collections (id, name, display_name, description, schema, is_active, managed, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      await insertStmt.bind(
        collectionId,
        config.name,
        config.displayName,
        config.description || null,
        schemaJson,
        isActive,
        managed,
        now,
        now
      ).run();
      console.log(`  \u2713 Created collection: ${config.name}`);
      return {
        name: config.name,
        status: "created",
        message: `Created collection "${config.displayName}"`
      };
    } else {
      const existingSchema = existing.schema ? JSON.stringify(existing.schema) : "{}";
      const existingDisplayName = existing.display_name;
      const existingDescription = existing.description;
      const existingIsActive = existing.is_active;
      const existingManaged = existing.managed;
      const needsUpdate = schemaJson !== existingSchema || config.displayName !== existingDisplayName || (config.description || null) !== existingDescription || isActive !== existingIsActive || managed !== existingManaged;
      if (!needsUpdate) {
        return {
          name: config.name,
          status: "unchanged",
          message: `Collection "${config.displayName}" is up to date`
        };
      }
      const updateStmt = db.prepare(`
        UPDATE collections
        SET display_name = ?, description = ?, schema = ?, is_active = ?, managed = ?, updated_at = ?
        WHERE name = ?
      `);
      await updateStmt.bind(
        config.displayName,
        config.description || null,
        schemaJson,
        isActive,
        managed,
        now,
        config.name
      ).run();
      console.log(`  \u2713 Updated collection: ${config.name}`);
      return {
        name: config.name,
        status: "updated",
        message: `Updated collection "${config.displayName}"`
      };
    }
  } catch (error) {
    console.error(`  \u2717 Error syncing collection ${config.name}:`, error);
    return {
      name: config.name,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function isCollectionManaged(db, collectionName) {
  try {
    const stmt = db.prepare("SELECT managed FROM collections WHERE name = ?");
    const result = await stmt.bind(collectionName).first();
    return result?.managed === 1;
  } catch (error) {
    console.error(`Error checking if collection is managed:`, error);
    return false;
  }
}
async function getManagedCollections(db) {
  try {
    const stmt = db.prepare("SELECT name FROM collections WHERE managed = 1 AND (source_type IS NULL OR source_type = 'user')");
    const { results } = await stmt.all();
    return (results || []).map((row) => row.name);
  } catch (error) {
    console.error("Error getting managed collections:", error);
    return [];
  }
}
async function cleanupRemovedCollections(db) {
  try {
    const configs = await loadCollectionConfigs();
    const configNames = new Set(configs.map((c) => c.name));
    const managedCollections = await getManagedCollections(db);
    const removed = [];
    for (const managedName of managedCollections) {
      if (!configNames.has(managedName)) {
        const updateStmt = db.prepare(`
          UPDATE collections
          SET is_active = 0, updated_at = ?
          WHERE name = ? AND managed = 1
        `);
        await updateStmt.bind(Date.now(), managedName).run();
        removed.push(managedName);
        console.log(`  \u26A0\uFE0F  Deactivated removed collection: ${managedName}`);
      }
    }
    return removed;
  } catch (error) {
    console.error("Error cleaning up removed collections:", error);
    return [];
  }
}
async function fullCollectionSync(db) {
  const results = await syncCollections(db);
  const removed = await cleanupRemovedCollections(db);
  return { results, removed };
}

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  apiTokens: () => apiTokens,
  collections: () => collections,
  content: () => content,
  contentVersions: () => contentVersions,
  formFiles: () => formFiles,
  formSubmissions: () => formSubmissions,
  forms: () => forms,
  insertCollectionSchema: () => insertCollectionSchema,
  insertContentSchema: () => insertContentSchema,
  insertFormFileSchema: () => insertFormFileSchema,
  insertFormSchema: () => insertFormSchema,
  insertFormSubmissionSchema: () => insertFormSubmissionSchema,
  insertLogConfigSchema: () => insertLogConfigSchema,
  insertMediaSchema: () => insertMediaSchema,
  insertPluginActivityLogSchema: () => insertPluginActivityLogSchema,
  insertPluginAssetSchema: () => insertPluginAssetSchema,
  insertPluginHookSchema: () => insertPluginHookSchema,
  insertPluginRouteSchema: () => insertPluginRouteSchema,
  insertPluginSchema: () => insertPluginSchema,
  insertSystemLogSchema: () => insertSystemLogSchema,
  insertUserSchema: () => insertUserSchema,
  insertWorkflowHistorySchema: () => insertWorkflowHistorySchema,
  logConfig: () => logConfig,
  media: () => media,
  pluginActivityLog: () => pluginActivityLog,
  pluginAssets: () => pluginAssets,
  pluginHooks: () => pluginHooks,
  pluginRoutes: () => pluginRoutes,
  plugins: () => plugins,
  selectCollectionSchema: () => selectCollectionSchema,
  selectContentSchema: () => selectContentSchema,
  selectFormFileSchema: () => selectFormFileSchema,
  selectFormSchema: () => selectFormSchema,
  selectFormSubmissionSchema: () => selectFormSubmissionSchema,
  selectLogConfigSchema: () => selectLogConfigSchema,
  selectMediaSchema: () => selectMediaSchema,
  selectPluginActivityLogSchema: () => selectPluginActivityLogSchema,
  selectPluginAssetSchema: () => selectPluginAssetSchema,
  selectPluginHookSchema: () => selectPluginHookSchema,
  selectPluginRouteSchema: () => selectPluginRouteSchema,
  selectPluginSchema: () => selectPluginSchema,
  selectSystemLogSchema: () => selectSystemLogSchema,
  selectUserSchema: () => selectUserSchema,
  selectWorkflowHistorySchema: () => selectWorkflowHistorySchema,
  systemLogs: () => systemLogs,
  users: () => users,
  workflowHistory: () => workflowHistory
});
var CONSTANTS = {
  INT8_MIN: -128,
  INT8_MAX: 127,
  INT8_UNSIGNED_MAX: 255,
  INT16_MIN: -32768,
  INT16_MAX: 32767,
  INT16_UNSIGNED_MAX: 65535,
  INT24_MIN: -8388608,
  INT24_MAX: 8388607,
  INT24_UNSIGNED_MAX: 16777215,
  INT32_MIN: -2147483648,
  INT32_MAX: 2147483647,
  INT32_UNSIGNED_MAX: 4294967295,
  INT48_MIN: -140737488355328,
  INT48_MAX: 140737488355327,
  INT48_UNSIGNED_MAX: 281474976710655,
  INT64_MIN: -9223372036854775808n,
  INT64_MAX: 9223372036854775807n,
  INT64_UNSIGNED_MAX: 18446744073709551615n
};
function isColumnType(column, columnTypes) {
  return columnTypes.includes(column.columnType);
}
function isWithEnum(column) {
  return "enumValues" in column && Array.isArray(column.enumValues) && column.enumValues.length > 0;
}
var isPgEnum = isWithEnum;
var literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
var jsonSchema = z.union([
  literalSchema,
  z.record(z.string(), z.any()),
  z.array(z.any())
]);
var bufferSchema = z.custom((v) => v instanceof Buffer);
function columnToSchema(column, factory) {
  const z$1 = z;
  const coerce = {};
  let schema;
  if (isWithEnum(column)) {
    schema = column.enumValues.length ? z$1.enum(column.enumValues) : z$1.string();
  }
  if (!schema) {
    if (isColumnType(column, ["PgGeometry", "PgPointTuple"])) {
      schema = z$1.tuple([z$1.number(), z$1.number()]);
    } else if (isColumnType(column, ["PgGeometryObject", "PgPointObject"])) {
      schema = z$1.object({ x: z$1.number(), y: z$1.number() });
    } else if (isColumnType(column, ["PgHalfVector", "PgVector"])) {
      schema = z$1.array(z$1.number());
      schema = column.dimensions ? schema.length(column.dimensions) : schema;
    } else if (isColumnType(column, ["PgLine"])) {
      schema = z$1.tuple([z$1.number(), z$1.number(), z$1.number()]);
    } else if (isColumnType(column, ["PgLineABC"])) {
      schema = z$1.object({
        a: z$1.number(),
        b: z$1.number(),
        c: z$1.number()
      });
    } else if (isColumnType(column, ["PgArray"])) {
      schema = z$1.array(columnToSchema(column.baseColumn));
      schema = column.size ? schema.length(column.size) : schema;
    } else if (column.dataType === "array") {
      schema = z$1.array(z$1.any());
    } else if (column.dataType === "number") {
      schema = numberColumnToSchema(column, z$1, coerce);
    } else if (column.dataType === "bigint") {
      schema = bigintColumnToSchema(column, z$1, coerce);
    } else if (column.dataType === "boolean") {
      schema = coerce === true || coerce.boolean ? z$1.coerce.boolean() : z$1.boolean();
    } else if (column.dataType === "date") {
      schema = coerce === true || coerce.date ? z$1.coerce.date() : z$1.date();
    } else if (column.dataType === "string") {
      schema = stringColumnToSchema(column, z$1, coerce);
    } else if (column.dataType === "json") {
      schema = jsonSchema;
    } else if (column.dataType === "custom") {
      schema = z$1.any();
    } else if (column.dataType === "buffer") {
      schema = bufferSchema;
    }
  }
  if (!schema) {
    schema = z$1.any();
  }
  return schema;
}
function numberColumnToSchema(column, z2, coerce) {
  let unsigned = column.getSQLType().includes("unsigned");
  let min;
  let max;
  let integer2 = false;
  if (isColumnType(column, ["MySqlTinyInt", "SingleStoreTinyInt"])) {
    min = unsigned ? 0 : CONSTANTS.INT8_MIN;
    max = unsigned ? CONSTANTS.INT8_UNSIGNED_MAX : CONSTANTS.INT8_MAX;
    integer2 = true;
  } else if (isColumnType(column, [
    "PgSmallInt",
    "PgSmallSerial",
    "MySqlSmallInt",
    "SingleStoreSmallInt"
  ])) {
    min = unsigned ? 0 : CONSTANTS.INT16_MIN;
    max = unsigned ? CONSTANTS.INT16_UNSIGNED_MAX : CONSTANTS.INT16_MAX;
    integer2 = true;
  } else if (isColumnType(column, [
    "PgReal",
    "MySqlFloat",
    "MySqlMediumInt",
    "SingleStoreMediumInt",
    "SingleStoreFloat"
  ])) {
    min = unsigned ? 0 : CONSTANTS.INT24_MIN;
    max = unsigned ? CONSTANTS.INT24_UNSIGNED_MAX : CONSTANTS.INT24_MAX;
    integer2 = isColumnType(column, ["MySqlMediumInt", "SingleStoreMediumInt"]);
  } else if (isColumnType(column, [
    "PgInteger",
    "PgSerial",
    "MySqlInt",
    "SingleStoreInt"
  ])) {
    min = unsigned ? 0 : CONSTANTS.INT32_MIN;
    max = unsigned ? CONSTANTS.INT32_UNSIGNED_MAX : CONSTANTS.INT32_MAX;
    integer2 = true;
  } else if (isColumnType(column, [
    "PgDoublePrecision",
    "MySqlReal",
    "MySqlDouble",
    "SingleStoreReal",
    "SingleStoreDouble",
    "SQLiteReal"
  ])) {
    min = unsigned ? 0 : CONSTANTS.INT48_MIN;
    max = unsigned ? CONSTANTS.INT48_UNSIGNED_MAX : CONSTANTS.INT48_MAX;
  } else if (isColumnType(column, [
    "PgBigInt53",
    "PgBigSerial53",
    "MySqlBigInt53",
    "MySqlSerial",
    "SingleStoreBigInt53",
    "SingleStoreSerial",
    "SQLiteInteger"
  ])) {
    unsigned = unsigned || isColumnType(column, ["MySqlSerial", "SingleStoreSerial"]);
    min = unsigned ? 0 : Number.MIN_SAFE_INTEGER;
    max = Number.MAX_SAFE_INTEGER;
    integer2 = true;
  } else if (isColumnType(column, ["MySqlYear", "SingleStoreYear"])) {
    min = 1901;
    max = 2155;
    integer2 = true;
  } else {
    min = Number.MIN_SAFE_INTEGER;
    max = Number.MAX_SAFE_INTEGER;
  }
  let schema = coerce === true || coerce?.number ? integer2 ? z2.coerce.number() : z2.coerce.number().int() : integer2 ? z2.int() : z2.number();
  schema = schema.gte(min).lte(max);
  return schema;
}
function bigintColumnToSchema(column, z2, coerce) {
  const unsigned = column.getSQLType().includes("unsigned");
  const min = unsigned ? 0n : CONSTANTS.INT64_MIN;
  const max = unsigned ? CONSTANTS.INT64_UNSIGNED_MAX : CONSTANTS.INT64_MAX;
  const schema = coerce === true || coerce?.bigint ? z2.coerce.bigint() : z2.bigint();
  return schema.gte(min).lte(max);
}
function stringColumnToSchema(column, z2, coerce) {
  if (isColumnType(column, ["PgUUID"])) {
    return z2.uuid();
  }
  let max;
  let regex;
  let fixed = false;
  if (isColumnType(column, ["PgVarchar", "SQLiteText"])) {
    max = column.length;
  } else if (isColumnType(column, ["MySqlVarChar", "SingleStoreVarChar"])) {
    max = column.length ?? CONSTANTS.INT16_UNSIGNED_MAX;
  } else if (isColumnType(column, ["MySqlText", "SingleStoreText"])) {
    if (column.textType === "longtext") {
      max = CONSTANTS.INT32_UNSIGNED_MAX;
    } else if (column.textType === "mediumtext") {
      max = CONSTANTS.INT24_UNSIGNED_MAX;
    } else if (column.textType === "text") {
      max = CONSTANTS.INT16_UNSIGNED_MAX;
    } else {
      max = CONSTANTS.INT8_UNSIGNED_MAX;
    }
  }
  if (isColumnType(column, [
    "PgChar",
    "MySqlChar",
    "SingleStoreChar"
  ])) {
    max = column.length;
    fixed = true;
  }
  if (isColumnType(column, ["PgBinaryVector"])) {
    regex = /^[01]+$/;
    max = column.dimensions;
  }
  let schema = coerce === true || coerce?.string ? z2.coerce.string() : z2.string();
  schema = regex ? schema.regex(regex) : schema;
  return max && fixed ? schema.length(max) : max ? schema.max(max) : schema;
}
function getColumns(tableLike) {
  return isTable(tableLike) ? getTableColumns(tableLike) : getViewSelectedFields(tableLike);
}
function handleColumns(columns, refinements, conditions, factory) {
  const columnSchemas = {};
  for (const [key, selected] of Object.entries(columns)) {
    if (!is(selected, Column) && !is(selected, SQL) && !is(selected, SQL.Aliased) && typeof selected === "object") {
      const columns2 = isTable(selected) || isView(selected) ? getColumns(selected) : selected;
      columnSchemas[key] = handleColumns(columns2, refinements[key] ?? {}, conditions);
      continue;
    }
    const refinement = refinements[key];
    if (refinement !== void 0 && typeof refinement !== "function") {
      columnSchemas[key] = refinement;
      continue;
    }
    const column = is(selected, Column) ? selected : void 0;
    const schema = column ? columnToSchema(column) : z.any();
    const refined = typeof refinement === "function" ? refinement(schema) : schema;
    if (conditions.never(column)) {
      continue;
    } else {
      columnSchemas[key] = refined;
    }
    if (column) {
      if (conditions.nullable(column)) {
        columnSchemas[key] = columnSchemas[key].nullable();
      }
      if (conditions.optional(column)) {
        columnSchemas[key] = columnSchemas[key].optional();
      }
    }
  }
  return z.object(columnSchemas);
}
function handleEnum(enum_, factory) {
  const zod = z;
  return zod.enum(enum_.enumValues);
}
var selectConditions = {
  never: () => false,
  optional: () => false,
  nullable: (column) => !column.notNull
};
var insertConditions = {
  never: (column) => column?.generated?.type === "always" || column?.generatedIdentity?.type === "always",
  optional: (column) => !column.notNull || column.notNull && column.hasDefault,
  nullable: (column) => !column.notNull
};
var createSelectSchema = (entity, refine) => {
  if (isPgEnum(entity)) {
    return handleEnum(entity);
  }
  const columns = getColumns(entity);
  return handleColumns(columns, {}, selectConditions);
};
var createInsertSchema = (entity, refine) => {
  const columns = getColumns(entity);
  return handleColumns(columns, refine ?? {}, insertConditions);
};

// src/db/schema.ts
var users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  passwordHash: text("password_hash"),
  // Hashed password, nullable for OAuth users
  role: text("role").notNull().default("viewer"),
  // 'admin', 'editor', 'author', 'viewer'
  avatar: text("avatar"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastLoginAt: integer("last_login_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull()
});
var collections = sqliteTable("collections", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  schema: text("schema", { mode: "json" }).notNull(),
  // JSON schema definition
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  managed: integer("managed", { mode: "boolean" }).notNull().default(false),
  // Config-managed collections cannot be edited in UI
  sourceType: text("source_type").default("user"),
  // 'user' (normal), 'form' (form-derived)
  sourceId: text("source_id"),
  // stores the form ID for form-derived collections
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
});
var content = sqliteTable("content", {
  id: text("id").primaryKey(),
  collectionId: text("collection_id").notNull().references(() => collections.id),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  data: text("data", { mode: "json" }).notNull(),
  // JSON content data
  status: text("status").notNull().default("draft"),
  // 'draft', 'published', 'archived'
  publishedAt: integer("published_at", { mode: "timestamp" }),
  authorId: text("author_id").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
});
var contentVersions = sqliteTable("content_versions", {
  id: text("id").primaryKey(),
  contentId: text("content_id").notNull().references(() => content.id),
  version: integer("version").notNull(),
  data: text("data", { mode: "json" }).notNull(),
  authorId: text("author_id").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
});
var media = sqliteTable("media", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  width: integer("width"),
  height: integer("height"),
  folder: text("folder").notNull().default("uploads"),
  r2Key: text("r2_key").notNull(),
  // R2 storage key
  publicUrl: text("public_url").notNull(),
  // CDN URL
  thumbnailUrl: text("thumbnail_url"),
  alt: text("alt"),
  caption: text("caption"),
  tags: text("tags", { mode: "json" }),
  // JSON array of tags
  uploadedBy: text("uploaded_by").notNull().references(() => users.id),
  uploadedAt: integer("uploaded_at").notNull(),
  updatedAt: integer("updated_at"),
  publishedAt: integer("published_at"),
  scheduledAt: integer("scheduled_at"),
  archivedAt: integer("archived_at"),
  deletedAt: integer("deleted_at")
});
var apiTokens = sqliteTable("api_tokens", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  token: text("token").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id),
  permissions: text("permissions", { mode: "json" }).notNull(),
  // Array of permissions
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
});
var workflowHistory = sqliteTable("workflow_history", {
  id: text("id").primaryKey(),
  contentId: text("content_id").notNull().references(() => content.id),
  action: text("action").notNull(),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  comment: text("comment"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
});
var plugins = sqliteTable("plugins", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  version: text("version").notNull(),
  author: text("author").notNull(),
  category: text("category").notNull(),
  icon: text("icon"),
  status: text("status").notNull().default("inactive"),
  // 'active', 'inactive', 'error'
  isCore: integer("is_core", { mode: "boolean" }).notNull().default(false),
  settings: text("settings", { mode: "json" }),
  permissions: text("permissions", { mode: "json" }),
  dependencies: text("dependencies", { mode: "json" }),
  downloadCount: integer("download_count").notNull().default(0),
  rating: integer("rating").notNull().default(0),
  installedAt: integer("installed_at").notNull(),
  activatedAt: integer("activated_at"),
  lastUpdated: integer("last_updated").notNull(),
  errorMessage: text("error_message"),
  createdAt: integer("created_at").notNull().$defaultFn(() => Math.floor(Date.now() / 1e3)),
  updatedAt: integer("updated_at").notNull().$defaultFn(() => Math.floor(Date.now() / 1e3))
});
var pluginHooks = sqliteTable("plugin_hooks", {
  id: text("id").primaryKey(),
  pluginId: text("plugin_id").notNull().references(() => plugins.id),
  hookName: text("hook_name").notNull(),
  handlerName: text("handler_name").notNull(),
  priority: integer("priority").notNull().default(10),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull().$defaultFn(() => Math.floor(Date.now() / 1e3))
});
var pluginRoutes = sqliteTable("plugin_routes", {
  id: text("id").primaryKey(),
  pluginId: text("plugin_id").notNull().references(() => plugins.id),
  path: text("path").notNull(),
  method: text("method").notNull(),
  handlerName: text("handler_name").notNull(),
  middleware: text("middleware", { mode: "json" }),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull().$defaultFn(() => Math.floor(Date.now() / 1e3))
});
var pluginAssets = sqliteTable("plugin_assets", {
  id: text("id").primaryKey(),
  pluginId: text("plugin_id").notNull().references(() => plugins.id),
  assetType: text("asset_type").notNull(),
  // 'css', 'js', 'image', 'font'
  assetPath: text("asset_path").notNull(),
  loadOrder: integer("load_order").notNull().default(100),
  loadLocation: text("load_location").notNull().default("footer"),
  // 'header', 'footer'
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull().$defaultFn(() => Math.floor(Date.now() / 1e3))
});
var pluginActivityLog = sqliteTable("plugin_activity_log", {
  id: text("id").primaryKey(),
  pluginId: text("plugin_id").notNull().references(() => plugins.id),
  action: text("action").notNull(),
  userId: text("user_id"),
  details: text("details", { mode: "json" }),
  timestamp: integer("timestamp").notNull().$defaultFn(() => Math.floor(Date.now() / 1e3))
});
var insertUserSchema = createInsertSchema(users, {
  email: (schema) => schema.email(),
  firstName: (schema) => schema.min(1),
  lastName: (schema) => schema.min(1),
  username: (schema) => schema.min(3)
});
var selectUserSchema = createSelectSchema(users);
var insertCollectionSchema = createInsertSchema(collections, {
  name: (schema) => schema.min(1).regex(/^[a-z0-9_]+$/, "Collection name must be lowercase with underscores"),
  displayName: (schema) => schema.min(1)
});
var selectCollectionSchema = createSelectSchema(collections);
var insertContentSchema = createInsertSchema(content, {
  slug: (schema) => schema.min(1).regex(/^[a-zA-Z0-9_-]+$/, "Slug must contain only letters, numbers, underscores, and hyphens"),
  title: (schema) => schema.min(1),
  status: (schema) => schema
});
var selectContentSchema = createSelectSchema(content);
var insertMediaSchema = createInsertSchema(media, {
  filename: (schema) => schema.min(1),
  originalName: (schema) => schema.min(1),
  mimeType: (schema) => schema.min(1),
  size: (schema) => schema.positive(),
  r2Key: (schema) => schema.min(1),
  publicUrl: (schema) => schema.url(),
  folder: (schema) => schema.min(1)
});
var selectMediaSchema = createSelectSchema(media);
var insertWorkflowHistorySchema = createInsertSchema(workflowHistory, {
  action: (schema) => schema.min(1),
  fromStatus: (schema) => schema.min(1),
  toStatus: (schema) => schema.min(1)
});
var selectWorkflowHistorySchema = createSelectSchema(workflowHistory);
var insertPluginSchema = createInsertSchema(plugins, {
  name: (schema) => schema.min(1),
  displayName: (schema) => schema.min(1),
  version: (schema) => schema.min(1),
  author: (schema) => schema.min(1),
  category: (schema) => schema.min(1)
});
var selectPluginSchema = createSelectSchema(plugins);
var insertPluginHookSchema = createInsertSchema(pluginHooks, {
  hookName: (schema) => schema.min(1),
  handlerName: (schema) => schema.min(1)
});
var selectPluginHookSchema = createSelectSchema(pluginHooks);
var insertPluginRouteSchema = createInsertSchema(pluginRoutes, {
  path: (schema) => schema.min(1),
  method: (schema) => schema.min(1),
  handlerName: (schema) => schema.min(1)
});
var selectPluginRouteSchema = createSelectSchema(pluginRoutes);
var insertPluginAssetSchema = createInsertSchema(pluginAssets, {
  assetType: (schema) => schema.min(1),
  assetPath: (schema) => schema.min(1)
});
var selectPluginAssetSchema = createSelectSchema(pluginAssets);
var insertPluginActivityLogSchema = createInsertSchema(pluginActivityLog, {
  action: (schema) => schema.min(1)
});
var selectPluginActivityLogSchema = createSelectSchema(pluginActivityLog);
var systemLogs = sqliteTable("system_logs", {
  id: text("id").primaryKey(),
  level: text("level").notNull(),
  // 'debug', 'info', 'warn', 'error', 'fatal'
  category: text("category").notNull(),
  // 'auth', 'api', 'workflow', 'plugin', 'media', 'system', etc.
  message: text("message").notNull(),
  data: text("data", { mode: "json" }),
  // Additional structured data
  userId: text("user_id").references(() => users.id),
  sessionId: text("session_id"),
  requestId: text("request_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  method: text("method"),
  // HTTP method for API logs
  url: text("url"),
  // Request URL for API logs
  statusCode: integer("status_code"),
  // HTTP status code for API logs
  duration: integer("duration"),
  // Request duration in milliseconds
  stackTrace: text("stack_trace"),
  // Error stack trace for error logs
  tags: text("tags", { mode: "json" }),
  // Array of tags for categorization
  source: text("source"),
  // Source component/module that generated the log
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
});
var logConfig = sqliteTable("log_config", {
  id: text("id").primaryKey(),
  category: text("category").notNull().unique(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  level: text("level").notNull().default("info"),
  // minimum log level to store
  retention: integer("retention").notNull().default(30),
  // days to keep logs
  maxSize: integer("max_size").default(1e4),
  // max number of logs per category
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
});
var insertSystemLogSchema = createInsertSchema(systemLogs, {
  level: (schema) => schema.min(1),
  category: (schema) => schema.min(1),
  message: (schema) => schema.min(1)
});
var selectSystemLogSchema = createSelectSchema(systemLogs);
var insertLogConfigSchema = createInsertSchema(logConfig, {
  category: (schema) => schema.min(1),
  level: (schema) => schema.min(1)
});
var selectLogConfigSchema = createSelectSchema(logConfig);
var forms = sqliteTable("forms", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  // Machine name (e.g., "contact-form")
  displayName: text("display_name").notNull(),
  // Human name (e.g., "Contact Form")
  description: text("description"),
  category: text("category").notNull().default("general"),
  // contact, survey, registration, etc.
  // Form.io schema (JSON)
  formioSchema: text("formio_schema", { mode: "json" }).notNull(),
  // Complete Form.io JSON schema
  // Settings (JSON)
  settings: text("settings", { mode: "json" }),
  // emailNotifications, successMessage, etc.
  // Status & Management
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true),
  managed: integer("managed", { mode: "boolean" }).notNull().default(false),
  // Metadata
  icon: text("icon"),
  color: text("color"),
  tags: text("tags", { mode: "json" }),
  // JSON array
  // Stats
  submissionCount: integer("submission_count").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),
  // Ownership
  createdBy: text("created_by").references(() => users.id),
  updatedBy: text("updated_by").references(() => users.id),
  // Timestamps
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull()
});
var formSubmissions = sqliteTable("form_submissions", {
  id: text("id").primaryKey(),
  formId: text("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
  // Submission data
  submissionData: text("submission_data", { mode: "json" }).notNull(),
  // The actual form data
  // Submission metadata
  status: text("status").notNull().default("pending"),
  // pending, reviewed, approved, rejected, spam
  submissionNumber: integer("submission_number"),
  // User information
  userId: text("user_id").references(() => users.id),
  userEmail: text("user_email"),
  // Tracking
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  // Review/Processing
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: integer("reviewed_at"),
  reviewNotes: text("review_notes"),
  // Flags
  isSpam: integer("is_spam", { mode: "boolean" }).notNull().default(false),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  // Content integration
  contentId: text("content_id").references(() => content.id),
  // Links submission to its content item
  // Timestamps
  submittedAt: integer("submitted_at").notNull(),
  updatedAt: integer("updated_at").notNull()
});
var formFiles = sqliteTable("form_files", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id").notNull().references(() => formSubmissions.id, { onDelete: "cascade" }),
  mediaId: text("media_id").notNull().references(() => media.id, { onDelete: "cascade" }),
  fieldName: text("field_name").notNull(),
  // Form field that uploaded this file
  uploadedAt: integer("uploaded_at").notNull()
});
var insertFormSchema = createInsertSchema(forms);
var selectFormSchema = createSelectSchema(forms);
var insertFormSubmissionSchema = createInsertSchema(formSubmissions);
var selectFormSubmissionSchema = createSelectSchema(formSubmissions);
var insertFormFileSchema = createInsertSchema(formFiles);
var selectFormFileSchema = createSelectSchema(formFiles);
var Logger = class {
  db;
  enabled = true;
  configCache = /* @__PURE__ */ new Map();
  lastConfigRefresh = 0;
  configRefreshInterval = 6e4;
  // 1 minute
  constructor(database) {
    this.db = drizzle(database);
  }
  /**
   * Log a debug message
   */
  async debug(category, message, data, context) {
    return this.log("debug", category, message, data, context);
  }
  /**
   * Log an info message
   */
  async info(category, message, data, context) {
    return this.log("info", category, message, data, context);
  }
  /**
   * Log a warning message
   */
  async warn(category, message, data, context) {
    return this.log("warn", category, message, data, context);
  }
  /**
   * Log an error message
   */
  async error(category, message, error, context) {
    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;
    return this.log("error", category, message, errorData, {
      ...context,
      stackTrace: error instanceof Error ? error.stack : void 0
    });
  }
  /**
   * Log a fatal message
   */
  async fatal(category, message, error, context) {
    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;
    return this.log("fatal", category, message, errorData, {
      ...context,
      stackTrace: error instanceof Error ? error.stack : void 0
    });
  }
  /**
   * Log an API request
   */
  async logRequest(method, url, statusCode, duration, context) {
    const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
    return this.log(level, "api", `${method} ${url} - ${statusCode}`, {
      method,
      url,
      statusCode,
      duration
    }, {
      ...context,
      method,
      url,
      statusCode,
      duration
    });
  }
  /**
   * Log an authentication event
   */
  async logAuth(action, userId, success = true, context) {
    const level = success ? "info" : "warn";
    return this.log(level, "auth", `Authentication ${action}: ${success ? "success" : "failed"}`, {
      action,
      success,
      userId
    }, {
      ...context,
      userId,
      tags: ["authentication", action]
    });
  }
  /**
   * Log a security event
   */
  async logSecurity(event, severity, context) {
    const level = severity === "critical" ? "fatal" : severity === "high" ? "error" : "warn";
    return this.log(level, "security", `Security event: ${event}`, {
      event,
      severity
    }, {
      ...context,
      tags: ["security", severity]
    });
  }
  /**
   * Core logging method
   */
  async log(level, category, message, data, context) {
    if (!this.enabled) return;
    try {
      const config = await this.getConfig(category);
      if (!config || !config.enabled || !this.shouldLog(level, config.level)) {
        return;
      }
      const logEntry = {
        id: crypto.randomUUID(),
        level,
        category,
        message,
        data: data ? JSON.stringify(data) : null,
        userId: context?.userId || null,
        sessionId: context?.sessionId || null,
        requestId: context?.requestId || null,
        ipAddress: context?.ipAddress || null,
        userAgent: context?.userAgent || null,
        method: context?.method || null,
        url: context?.url || null,
        statusCode: context?.statusCode || null,
        duration: context?.duration || null,
        stackTrace: context?.stackTrace || null,
        tags: context?.tags ? JSON.stringify(context.tags) : null,
        source: context?.source || null,
        createdAt: /* @__PURE__ */ new Date()
      };
      await this.db.insert(systemLogs).values(logEntry);
      if (config.maxSize) {
        await this.cleanupCategory(category, config.maxSize);
      }
    } catch (error) {
      console.error("Logger error:", error);
    }
  }
  /**
   * Get a single log entry by ID
   */
  async getLogById(id) {
    try {
      const results = await this.db.select().from(systemLogs).where(eq(systemLogs.id, id)).limit(1);
      return results[0] || null;
    } catch (error) {
      console.error("Error getting log by ID:", error);
      return null;
    }
  }
  /**
   * Get logs with filtering and pagination
   */
  async getLogs(filter = {}) {
    try {
      const conditions = [];
      if (filter.level && filter.level.length > 0) {
        conditions.push(inArray(systemLogs.level, filter.level));
      }
      if (filter.category && filter.category.length > 0) {
        conditions.push(inArray(systemLogs.category, filter.category));
      }
      if (filter.userId) {
        conditions.push(eq(systemLogs.userId, filter.userId));
      }
      if (filter.source) {
        conditions.push(eq(systemLogs.source, filter.source));
      }
      if (filter.search) {
        conditions.push(
          like(systemLogs.message, `%${filter.search}%`)
        );
      }
      if (filter.startDate) {
        conditions.push(gte(systemLogs.createdAt, filter.startDate));
      }
      if (filter.endDate) {
        conditions.push(lte(systemLogs.createdAt, filter.endDate));
      }
      const whereClause = conditions.length > 0 ? and(...conditions) : void 0;
      const totalResult = await this.db.select({ count: count() }).from(systemLogs).where(whereClause);
      const total = totalResult[0]?.count || 0;
      const sortColumn = filter.sortBy === "level" ? systemLogs.level : filter.sortBy === "category" ? systemLogs.category : systemLogs.createdAt;
      const sortFn = filter.sortOrder === "asc" ? asc : desc;
      const logs = await this.db.select().from(systemLogs).where(whereClause).orderBy(sortFn(sortColumn)).limit(filter.limit || 50).offset(filter.offset || 0);
      return { logs, total };
    } catch (error) {
      console.error("Error getting logs:", error);
      return { logs: [], total: 0 };
    }
  }
  /**
   * Get log configuration for a category
   */
  async getConfig(category) {
    try {
      const now = Date.now();
      if (this.configCache.has(category) && now - this.lastConfigRefresh < this.configRefreshInterval) {
        return this.configCache.get(category) || null;
      }
      const configs = await this.db.select().from(logConfig).where(eq(logConfig.category, category));
      const config = configs[0] || null;
      if (config) {
        this.configCache.set(category, config);
        this.lastConfigRefresh = now;
      }
      return config;
    } catch (error) {
      console.error("Error getting log config:", error);
      return null;
    }
  }
  /**
   * Update log configuration
   */
  async updateConfig(category, updates) {
    try {
      await this.db.update(logConfig).set({
        ...updates,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(logConfig.category, category));
      this.configCache.delete(category);
    } catch (error) {
      console.error("Error updating log config:", error);
    }
  }
  /**
   * Get all log configurations
   */
  async getAllConfigs() {
    try {
      return await this.db.select().from(logConfig);
    } catch (error) {
      console.error("Error getting log configs:", error);
      return [];
    }
  }
  /**
   * Clean up old logs for a category
   */
  async cleanupCategory(category, maxSize) {
    try {
      const countResult = await this.db.select({ count: count() }).from(systemLogs).where(eq(systemLogs.category, category));
      const currentCount = countResult[0]?.count || 0;
      if (currentCount > maxSize) {
        const cutoffLogs = await this.db.select({ createdAt: systemLogs.createdAt }).from(systemLogs).where(eq(systemLogs.category, category)).orderBy(desc(systemLogs.createdAt)).limit(1).offset(maxSize - 1);
        if (cutoffLogs[0]) {
          await this.db.delete(systemLogs).where(
            and(
              eq(systemLogs.category, category),
              lte(systemLogs.createdAt, cutoffLogs[0].createdAt)
            )
          );
        }
      }
    } catch (error) {
      console.error("Error cleaning up logs:", error);
    }
  }
  /**
   * Clean up logs based on retention policy
   */
  async cleanupByRetention() {
    try {
      const configs = await this.getAllConfigs();
      for (const config of configs) {
        if (config.retention > 0) {
          const cutoffDate = /* @__PURE__ */ new Date();
          cutoffDate.setDate(cutoffDate.getDate() - config.retention);
          await this.db.delete(systemLogs).where(
            and(
              eq(systemLogs.category, config.category),
              lte(systemLogs.createdAt, cutoffDate)
            )
          );
        }
      }
    } catch (error) {
      console.error("Error cleaning up logs by retention:", error);
    }
  }
  /**
   * Check if a log level should be recorded based on configuration
   */
  shouldLog(level, configLevel) {
    const levels = ["debug", "info", "warn", "error", "fatal"];
    const levelIndex = levels.indexOf(level);
    const configLevelIndex = levels.indexOf(configLevel);
    return levelIndex >= configLevelIndex;
  }
  /**
   * Enable or disable logging
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
  /**
   * Check if logging is enabled
   */
  isEnabled() {
    return this.enabled;
  }
};
var loggerInstance = null;
function getLogger(database) {
  if (!loggerInstance && database) {
    loggerInstance = new Logger(database);
  }
  if (!loggerInstance) {
    throw new Error("Logger not initialized. Call getLogger with a database instance first.");
  }
  return loggerInstance;
}
function initLogger(database) {
  loggerInstance = new Logger(database);
  return loggerInstance;
}

// src/services/plugin-service.ts
var PluginService = class {
  constructor(db) {
    this.db = db;
  }
  async getAllPlugins() {
    await this.ensureAllPluginsExist();
    const stmt = this.db.prepare(`
      SELECT * FROM plugins
      ORDER BY is_core DESC, display_name ASC
    `);
    const { results } = await stmt.all();
    return (results || []).map(this.mapPluginFromDb);
  }
  /**
   * Ensure all plugins from the registry exist in the database
   * Auto-installs any newly detected plugins with inactive status
   *
   * Note: This method should be overridden or configured with a plugin registry
   * in the consuming application
   */
  async ensureAllPluginsExist() {
    console.log("[PluginService] ensureAllPluginsExist - requires PLUGIN_REGISTRY configuration");
  }
  async getPlugin(pluginId) {
    const stmt = this.db.prepare("SELECT * FROM plugins WHERE id = ?");
    const plugin = await stmt.bind(pluginId).first();
    if (!plugin) return null;
    return this.mapPluginFromDb(plugin);
  }
  async getPluginByName(name) {
    const stmt = this.db.prepare("SELECT * FROM plugins WHERE name = ?");
    const plugin = await stmt.bind(name).first();
    if (!plugin) return null;
    return this.mapPluginFromDb(plugin);
  }
  async getPluginStats() {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as errors
      FROM plugins
    `);
    const stats = await stmt.first();
    return {
      total: stats.total || 0,
      active: stats.active || 0,
      inactive: stats.inactive || 0,
      errors: stats.errors || 0,
      uninstalled: 0
    };
  }
  async installPlugin(pluginData) {
    const id = pluginData.id || `plugin-${Date.now()}`;
    const now = Math.floor(Date.now() / 1e3);
    const stmt = this.db.prepare(`
      INSERT INTO plugins (
        id, name, display_name, description, version, author, category, icon,
        status, is_core, settings, permissions, dependencies, download_count, 
        rating, installed_at, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    await stmt.bind(
      id,
      pluginData.name || id,
      pluginData.display_name || "Unnamed Plugin",
      pluginData.description || "",
      pluginData.version || "1.0.0",
      pluginData.author || "Unknown",
      pluginData.category || "utilities",
      pluginData.icon || "\u{1F50C}",
      "inactive",
      pluginData.is_core || false,
      JSON.stringify(pluginData.settings || {}),
      JSON.stringify(pluginData.permissions || []),
      JSON.stringify(pluginData.dependencies || []),
      pluginData.download_count || 0,
      pluginData.rating || 0,
      now,
      now
    ).run();
    await this.logActivity(id, "installed", null, { version: pluginData.version });
    const installed = await this.getPlugin(id);
    if (!installed) throw new Error("Failed to install plugin");
    return installed;
  }
  async uninstallPlugin(pluginId) {
    const plugin = await this.getPlugin(pluginId);
    if (!plugin) throw new Error("Plugin not found");
    if (plugin.is_core) throw new Error("Cannot uninstall core plugins");
    if (plugin.status === "active") {
      await this.deactivatePlugin(pluginId);
    }
    const stmt = this.db.prepare("DELETE FROM plugins WHERE id = ?");
    await stmt.bind(pluginId).run();
    await this.logActivity(pluginId, "uninstalled", null, { name: plugin.name });
  }
  async activatePlugin(pluginId) {
    const plugin = await this.getPlugin(pluginId);
    if (!plugin) throw new Error("Plugin not found");
    if (plugin.dependencies && plugin.dependencies.length > 0) {
      await this.checkDependencies(plugin.dependencies);
    }
    const now = Math.floor(Date.now() / 1e3);
    const stmt = this.db.prepare(`
      UPDATE plugins 
      SET status = 'active', activated_at = ?, error_message = NULL 
      WHERE id = ?
    `);
    await stmt.bind(now, pluginId).run();
    await this.logActivity(pluginId, "activated", null);
  }
  async deactivatePlugin(pluginId) {
    const plugin = await this.getPlugin(pluginId);
    if (!plugin) throw new Error("Plugin not found");
    await this.checkDependents(plugin.name);
    const stmt = this.db.prepare(`
      UPDATE plugins 
      SET status = 'inactive', activated_at = NULL 
      WHERE id = ?
    `);
    await stmt.bind(pluginId).run();
    await this.logActivity(pluginId, "deactivated", null);
  }
  async updatePluginSettings(pluginId, settings) {
    const plugin = await this.getPlugin(pluginId);
    if (!plugin) throw new Error("Plugin not found");
    const stmt = this.db.prepare(`
      UPDATE plugins 
      SET settings = ?, updated_at = unixepoch() 
      WHERE id = ?
    `);
    await stmt.bind(JSON.stringify(settings), pluginId).run();
    await this.logActivity(pluginId, "settings_updated", null);
  }
  async setPluginError(pluginId, error) {
    const stmt = this.db.prepare(`
      UPDATE plugins 
      SET status = 'error', error_message = ? 
      WHERE id = ?
    `);
    await stmt.bind(error, pluginId).run();
    await this.logActivity(pluginId, "error", null, { error });
  }
  async getPluginActivity(pluginId, limit = 10) {
    const stmt = this.db.prepare(`
      SELECT * FROM plugin_activity_log 
      WHERE plugin_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    const { results } = await stmt.bind(pluginId, limit).all();
    return (results || []).map((row) => ({
      id: row.id,
      action: row.action,
      userId: row.user_id,
      details: row.details ? JSON.parse(row.details) : null,
      timestamp: row.timestamp
    }));
  }
  async registerHook(pluginId, hookName, handlerName, priority = 10) {
    const id = `hook-${Date.now()}`;
    const stmt = this.db.prepare(`
      INSERT INTO plugin_hooks (id, plugin_id, hook_name, handler_name, priority)
      VALUES (?, ?, ?, ?, ?)
    `);
    await stmt.bind(id, pluginId, hookName, handlerName, priority).run();
  }
  async registerRoute(pluginId, path, method, handlerName, middleware) {
    const id = `route-${Date.now()}`;
    const stmt = this.db.prepare(`
      INSERT INTO plugin_routes (id, plugin_id, path, method, handler_name, middleware)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    await stmt.bind(
      id,
      pluginId,
      path,
      method,
      handlerName,
      JSON.stringify(middleware || [])
    ).run();
  }
  async getPluginHooks(pluginId) {
    const stmt = this.db.prepare(`
      SELECT * FROM plugin_hooks 
      WHERE plugin_id = ? AND is_active = TRUE
      ORDER BY priority ASC
    `);
    const { results } = await stmt.bind(pluginId).all();
    return results || [];
  }
  async getPluginRoutes(pluginId) {
    const stmt = this.db.prepare(`
      SELECT * FROM plugin_routes 
      WHERE plugin_id = ? AND is_active = TRUE
    `);
    const { results } = await stmt.bind(pluginId).all();
    return results || [];
  }
  async checkDependencies(dependencies) {
    for (const dep of dependencies) {
      const plugin = await this.getPluginByName(dep);
      if (!plugin || plugin.status !== "active") {
        throw new Error(`Required dependency '${dep}' is not active`);
      }
    }
  }
  async checkDependents(pluginName) {
    const stmt = this.db.prepare(`
      SELECT id, display_name FROM plugins 
      WHERE status = 'active' 
      AND dependencies LIKE ?
    `);
    const { results } = await stmt.bind(`%"${pluginName}"%`).all();
    if (results && results.length > 0) {
      const names = results.map((p) => p.display_name).join(", ");
      throw new Error(`Cannot deactivate. The following plugins depend on this one: ${names}`);
    }
  }
  async logActivity(pluginId, action, userId, details) {
    const id = `activity-${Date.now()}`;
    const stmt = this.db.prepare(`
      INSERT INTO plugin_activity_log (id, plugin_id, action, user_id, details)
      VALUES (?, ?, ?, ?, ?)
    `);
    await stmt.bind(
      id,
      pluginId,
      action,
      userId,
      details ? JSON.stringify(details) : null
    ).run();
  }
  mapPluginFromDb(row) {
    return {
      id: row.id,
      name: row.name,
      display_name: row.display_name,
      description: row.description,
      version: row.version,
      author: row.author,
      category: row.category,
      icon: row.icon,
      status: row.status,
      is_core: row.is_core === 1,
      settings: row.settings ? JSON.parse(row.settings) : void 0,
      permissions: row.permissions ? JSON.parse(row.permissions) : void 0,
      dependencies: row.dependencies ? JSON.parse(row.dependencies) : void 0,
      download_count: row.download_count || 0,
      rating: row.rating || 0,
      installed_at: row.installed_at,
      activated_at: row.activated_at,
      last_updated: row.last_updated,
      error_message: row.error_message
    };
  }
};

// src/services/plugin-bootstrap.ts
var PluginBootstrapService = class {
  constructor(db) {
    this.db = db;
    this.pluginService = new PluginService(db);
  }
  pluginService;
  /**
   * Core plugins that should always be available in the system
   */
  CORE_PLUGINS = [
    {
      id: "core-auth",
      name: "core-auth",
      display_name: "Authentication System",
      description: "Core authentication and user management system",
      version: "1.0.0",
      author: "SonicJS Team",
      category: "security",
      icon: "\u{1F510}",
      permissions: ["manage:users", "manage:roles", "manage:permissions"],
      dependencies: [],
      settings: {
        requiredFields: {
          email: { required: true, minLength: 5, label: "Email", type: "email" },
          password: { required: true, minLength: 8, label: "Password", type: "password" },
          username: { required: true, minLength: 3, label: "Username", type: "text" },
          firstName: { required: true, minLength: 1, label: "First Name", type: "text" },
          lastName: { required: true, minLength: 1, label: "Last Name", type: "text" }
        },
        validation: {
          emailFormat: true,
          allowDuplicateUsernames: false,
          passwordRequirements: {
            requireUppercase: false,
            requireLowercase: false,
            requireNumbers: false,
            requireSpecialChars: false
          }
        },
        registration: {
          enabled: true,
          requireEmailVerification: false,
          defaultRole: "viewer"
        }
      }
    },
    {
      id: "core-media",
      name: "core-media",
      display_name: "Media Manager",
      description: "Core media upload and management system",
      version: "1.0.0",
      author: "SonicJS Team",
      category: "media",
      icon: "\u{1F4F8}",
      permissions: ["manage:media", "upload:files"],
      dependencies: [],
      settings: {}
    },
    {
      id: "database-tools",
      name: "database-tools",
      display_name: "Database Tools",
      description: "Database management tools including truncate, backup, and validation",
      version: "1.0.0",
      author: "SonicJS Team",
      category: "system",
      icon: "\u{1F5C4}\uFE0F",
      permissions: ["manage:database", "admin"],
      dependencies: [],
      settings: {
        enableTruncate: true,
        enableBackup: true,
        enableValidation: true,
        requireConfirmation: true
      }
    },
    {
      id: "seed-data",
      name: "seed-data",
      display_name: "Seed Data",
      description: "Generate realistic example users and content for testing and development",
      version: "1.0.0",
      author: "SonicJS Team",
      category: "development",
      icon: "\u{1F331}",
      permissions: ["admin"],
      dependencies: [],
      settings: {
        userCount: 20,
        contentCount: 200,
        defaultPassword: "password123"
      }
    },
    {
      id: "core-cache",
      name: "core-cache",
      display_name: "Cache System",
      description: "Three-tiered caching system with memory, KV, and database layers",
      version: "1.0.0",
      author: "SonicJS Team",
      category: "performance",
      icon: "\u26A1",
      permissions: ["manage:cache", "view:stats"],
      dependencies: [],
      settings: {
        enableMemoryCache: true,
        enableKVCache: true,
        enableDatabaseCache: true,
        defaultTTL: 3600
      }
    },
    {
      id: "workflow-plugin",
      name: "workflow-plugin",
      display_name: "Workflow Management",
      description: "Content workflow management with approval chains, scheduling, and automation",
      version: "1.0.0-beta.1",
      author: "SonicJS Team",
      category: "content",
      icon: "\u{1F504}",
      permissions: ["manage:workflows", "view:workflows", "transition:content"],
      dependencies: ["content-plugin"],
      settings: {
        enableApprovalChains: true,
        enableScheduling: true,
        enableAutomation: true,
        enableNotifications: true
      }
    },
    {
      id: "easy-mdx",
      name: "easy-mdx",
      display_name: "EasyMDE Editor",
      description: "Lightweight markdown editor with live preview for richtext fields",
      version: "1.0.0",
      author: "SonicJS Team",
      category: "editor",
      icon: "\u270D\uFE0F",
      permissions: [],
      dependencies: [],
      settings: {
        defaultHeight: 400,
        toolbar: "full",
        placeholder: "Start writing your content..."
      }
    },
    {
      id: "ai-search",
      name: "ai-search-plugin",
      display_name: "AI Search",
      description: "Advanced search with Cloudflare AI Search. Full-text search, semantic search, and advanced filtering across all content collections.",
      version: "1.0.0",
      author: "SonicJS Team",
      category: "search",
      icon: "\u{1F50D}",
      permissions: ["settings:write", "admin:access", "content:read"],
      dependencies: [],
      settings: {
        enabled: false,
        ai_mode_enabled: true,
        selected_collections: [],
        dismissed_collections: [],
        autocomplete_enabled: true,
        cache_duration: 1,
        results_limit: 20,
        index_media: false
      }
    }
  ];
  /**
   * Bootstrap all core plugins - install them if they don't exist
   */
  async bootstrapCorePlugins() {
    console.log("[PluginBootstrap] Starting core plugin bootstrap process...");
    try {
      for (const corePlugin of this.CORE_PLUGINS) {
        await this.ensurePluginInstalled(corePlugin);
      }
      console.log(
        "[PluginBootstrap] Core plugin bootstrap completed successfully"
      );
    } catch (error) {
      console.error("[PluginBootstrap] Error during plugin bootstrap:", error);
      throw error;
    }
  }
  /**
   * Ensure a specific plugin is installed
   */
  async ensurePluginInstalled(plugin) {
    try {
      const existingPlugin = await this.pluginService.getPlugin(plugin.id);
      if (existingPlugin) {
        console.log(
          `[PluginBootstrap] Plugin already installed: ${plugin.display_name} (status: ${existingPlugin.status})`
        );
        if (existingPlugin.version !== plugin.version) {
          console.log(
            `[PluginBootstrap] Updating plugin version: ${plugin.display_name} from ${existingPlugin.version} to ${plugin.version}`
          );
          await this.updatePlugin(plugin);
        }
        if (plugin.id === "core-auth" && existingPlugin.status !== "active") {
          console.log(
            `[PluginBootstrap] Core-auth plugin is inactive, activating it now...`
          );
          await this.pluginService.activatePlugin(plugin.id);
        }
      } else {
        console.log(
          `[PluginBootstrap] Installing plugin: ${plugin.display_name}`
        );
        await this.pluginService.installPlugin({
          ...plugin,
          is_core: plugin.name.startsWith("core-")
        });
        if (plugin.name.startsWith("core-")) {
          console.log(
            `[PluginBootstrap] Activating newly installed core plugin: ${plugin.display_name}`
          );
          await this.pluginService.activatePlugin(plugin.id);
        }
      }
    } catch (error) {
      console.error(
        `[PluginBootstrap] Error ensuring plugin ${plugin.display_name}:`,
        error
      );
    }
  }
  /**
   * Update an existing plugin
   */
  async updatePlugin(plugin) {
    const now = Math.floor(Date.now() / 1e3);
    const stmt = this.db.prepare(`
      UPDATE plugins 
      SET 
        version = ?,
        description = ?,
        permissions = ?,
        settings = ?,
        last_updated = ?
      WHERE id = ?
    `);
    await stmt.bind(
      plugin.version,
      plugin.description,
      JSON.stringify(plugin.permissions),
      JSON.stringify(plugin.settings || {}),
      now,
      plugin.id
    ).run();
  }
  /**
   * Check if bootstrap is needed (first run detection)
   */
  async isBootstrapNeeded() {
    try {
      for (const corePlugin of this.CORE_PLUGINS.filter(
        (p) => p.name.startsWith("core-")
      )) {
        const exists = await this.pluginService.getPlugin(corePlugin.id);
        if (!exists) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error(
        "[PluginBootstrap] Error checking bootstrap status:",
        error
      );
      return true;
    }
  }
};

export { Logger, PluginBootstrapService, PluginService, apiTokens, cleanupRemovedCollections, collections, content, contentVersions, fullCollectionSync, getAvailableCollectionNames, getLogger, getManagedCollections, initLogger, insertCollectionSchema, insertContentSchema, insertLogConfigSchema, insertMediaSchema, insertPluginActivityLogSchema, insertPluginAssetSchema, insertPluginHookSchema, insertPluginRouteSchema, insertPluginSchema, insertSystemLogSchema, insertUserSchema, insertWorkflowHistorySchema, isCollectionManaged, loadCollectionConfig, loadCollectionConfigs, logConfig, media, pluginActivityLog, pluginAssets, pluginHooks, pluginRoutes, plugins, registerCollections, schema_exports, selectCollectionSchema, selectContentSchema, selectLogConfigSchema, selectMediaSchema, selectPluginActivityLogSchema, selectPluginAssetSchema, selectPluginHookSchema, selectPluginRouteSchema, selectPluginSchema, selectSystemLogSchema, selectUserSchema, selectWorkflowHistorySchema, syncCollection, syncCollections, systemLogs, users, validateCollectionConfig, workflowHistory };
//# sourceMappingURL=chunk-SJRJ6IR3.js.map
//# sourceMappingURL=chunk-SJRJ6IR3.js.map