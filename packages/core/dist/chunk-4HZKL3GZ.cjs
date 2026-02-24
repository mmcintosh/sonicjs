'use strict';

var chunkP3XDZL6Q_cjs = require('./chunk-P3XDZL6Q.cjs');
var chunkIGJUBJBW_cjs = require('./chunk-IGJUBJBW.cjs');
var sqliteCore = require('drizzle-orm/sqlite-core');
var v4 = require('zod/v4');
var drizzleOrm = require('drizzle-orm');
var d1 = require('drizzle-orm/d1');
var dev = require('hono/dev');

// src/db/schema.ts
var schema_exports = {};
chunkIGJUBJBW_cjs.__export(schema_exports, {
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
var literalSchema = v4.z.union([v4.z.string(), v4.z.number(), v4.z.boolean(), v4.z.null()]);
var jsonSchema = v4.z.union([
  literalSchema,
  v4.z.record(v4.z.string(), v4.z.any()),
  v4.z.array(v4.z.any())
]);
var bufferSchema = v4.z.custom((v) => v instanceof Buffer);
function columnToSchema(column, factory) {
  const z$1 = v4.z;
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
  return drizzleOrm.isTable(tableLike) ? drizzleOrm.getTableColumns(tableLike) : drizzleOrm.getViewSelectedFields(tableLike);
}
function handleColumns(columns, refinements, conditions, factory) {
  const columnSchemas = {};
  for (const [key, selected] of Object.entries(columns)) {
    if (!drizzleOrm.is(selected, drizzleOrm.Column) && !drizzleOrm.is(selected, drizzleOrm.SQL) && !drizzleOrm.is(selected, drizzleOrm.SQL.Aliased) && typeof selected === "object") {
      const columns2 = drizzleOrm.isTable(selected) || drizzleOrm.isView(selected) ? getColumns(selected) : selected;
      columnSchemas[key] = handleColumns(columns2, refinements[key] ?? {}, conditions);
      continue;
    }
    const refinement = refinements[key];
    if (refinement !== void 0 && typeof refinement !== "function") {
      columnSchemas[key] = refinement;
      continue;
    }
    const column = drizzleOrm.is(selected, drizzleOrm.Column) ? selected : void 0;
    const schema = column ? columnToSchema(column) : v4.z.any();
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
  return v4.z.object(columnSchemas);
}
function handleEnum(enum_, factory) {
  const zod = v4.z;
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
var users = sqliteCore.sqliteTable("users", {
  id: sqliteCore.text("id").primaryKey(),
  email: sqliteCore.text("email").notNull().unique(),
  username: sqliteCore.text("username").notNull().unique(),
  firstName: sqliteCore.text("first_name").notNull(),
  lastName: sqliteCore.text("last_name").notNull(),
  passwordHash: sqliteCore.text("password_hash"),
  // Hashed password, nullable for OAuth users
  role: sqliteCore.text("role").notNull().default("viewer"),
  // 'admin', 'editor', 'author', 'viewer'
  avatar: sqliteCore.text("avatar"),
  isActive: sqliteCore.integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastLoginAt: sqliteCore.integer("last_login_at"),
  createdAt: sqliteCore.integer("created_at").notNull(),
  updatedAt: sqliteCore.integer("updated_at").notNull()
});
var collections = sqliteCore.sqliteTable("collections", {
  id: sqliteCore.text("id").primaryKey(),
  name: sqliteCore.text("name").notNull().unique(),
  displayName: sqliteCore.text("display_name").notNull(),
  description: sqliteCore.text("description"),
  schema: sqliteCore.text("schema", { mode: "json" }).notNull(),
  // JSON schema definition
  isActive: sqliteCore.integer("is_active", { mode: "boolean" }).notNull().default(true),
  managed: sqliteCore.integer("managed", { mode: "boolean" }).notNull().default(false),
  // Config-managed collections cannot be edited in UI
  sourceType: sqliteCore.text("source_type").default("user"),
  // 'user' (normal), 'form' (form-derived)
  sourceId: sqliteCore.text("source_id"),
  // stores the form ID for form-derived collections
  createdAt: sqliteCore.integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date()),
  updatedAt: sqliteCore.integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
});
var content = sqliteCore.sqliteTable("content", {
  id: sqliteCore.text("id").primaryKey(),
  collectionId: sqliteCore.text("collection_id").notNull().references(() => collections.id),
  slug: sqliteCore.text("slug").notNull(),
  title: sqliteCore.text("title").notNull(),
  data: sqliteCore.text("data", { mode: "json" }).notNull(),
  // JSON content data
  status: sqliteCore.text("status").notNull().default("draft"),
  // 'draft', 'published', 'archived'
  publishedAt: sqliteCore.integer("published_at", { mode: "timestamp" }),
  authorId: sqliteCore.text("author_id").notNull().references(() => users.id),
  createdAt: sqliteCore.integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date()),
  updatedAt: sqliteCore.integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
});
var contentVersions = sqliteCore.sqliteTable("content_versions", {
  id: sqliteCore.text("id").primaryKey(),
  contentId: sqliteCore.text("content_id").notNull().references(() => content.id),
  version: sqliteCore.integer("version").notNull(),
  data: sqliteCore.text("data", { mode: "json" }).notNull(),
  authorId: sqliteCore.text("author_id").notNull().references(() => users.id),
  createdAt: sqliteCore.integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
});
var media = sqliteCore.sqliteTable("media", {
  id: sqliteCore.text("id").primaryKey(),
  filename: sqliteCore.text("filename").notNull(),
  originalName: sqliteCore.text("original_name").notNull(),
  mimeType: sqliteCore.text("mime_type").notNull(),
  size: sqliteCore.integer("size").notNull(),
  width: sqliteCore.integer("width"),
  height: sqliteCore.integer("height"),
  folder: sqliteCore.text("folder").notNull().default("uploads"),
  r2Key: sqliteCore.text("r2_key").notNull(),
  // R2 storage key
  publicUrl: sqliteCore.text("public_url").notNull(),
  // CDN URL
  thumbnailUrl: sqliteCore.text("thumbnail_url"),
  alt: sqliteCore.text("alt"),
  caption: sqliteCore.text("caption"),
  tags: sqliteCore.text("tags", { mode: "json" }),
  // JSON array of tags
  uploadedBy: sqliteCore.text("uploaded_by").notNull().references(() => users.id),
  uploadedAt: sqliteCore.integer("uploaded_at").notNull(),
  updatedAt: sqliteCore.integer("updated_at"),
  publishedAt: sqliteCore.integer("published_at"),
  scheduledAt: sqliteCore.integer("scheduled_at"),
  archivedAt: sqliteCore.integer("archived_at"),
  deletedAt: sqliteCore.integer("deleted_at")
});
var apiTokens = sqliteCore.sqliteTable("api_tokens", {
  id: sqliteCore.text("id").primaryKey(),
  name: sqliteCore.text("name").notNull(),
  token: sqliteCore.text("token").notNull().unique(),
  userId: sqliteCore.text("user_id").notNull().references(() => users.id),
  permissions: sqliteCore.text("permissions", { mode: "json" }).notNull(),
  // Array of permissions
  expiresAt: sqliteCore.integer("expires_at", { mode: "timestamp" }),
  lastUsedAt: sqliteCore.integer("last_used_at", { mode: "timestamp" }),
  createdAt: sqliteCore.integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
});
var workflowHistory = sqliteCore.sqliteTable("workflow_history", {
  id: sqliteCore.text("id").primaryKey(),
  contentId: sqliteCore.text("content_id").notNull().references(() => content.id),
  action: sqliteCore.text("action").notNull(),
  fromStatus: sqliteCore.text("from_status").notNull(),
  toStatus: sqliteCore.text("to_status").notNull(),
  userId: sqliteCore.text("user_id").notNull().references(() => users.id),
  comment: sqliteCore.text("comment"),
  createdAt: sqliteCore.integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
});
var plugins = sqliteCore.sqliteTable("plugins", {
  id: sqliteCore.text("id").primaryKey(),
  name: sqliteCore.text("name").notNull().unique(),
  displayName: sqliteCore.text("display_name").notNull(),
  description: sqliteCore.text("description"),
  version: sqliteCore.text("version").notNull(),
  author: sqliteCore.text("author").notNull(),
  category: sqliteCore.text("category").notNull(),
  icon: sqliteCore.text("icon"),
  status: sqliteCore.text("status").notNull().default("inactive"),
  // 'active', 'inactive', 'error'
  isCore: sqliteCore.integer("is_core", { mode: "boolean" }).notNull().default(false),
  settings: sqliteCore.text("settings", { mode: "json" }),
  permissions: sqliteCore.text("permissions", { mode: "json" }),
  dependencies: sqliteCore.text("dependencies", { mode: "json" }),
  downloadCount: sqliteCore.integer("download_count").notNull().default(0),
  rating: sqliteCore.integer("rating").notNull().default(0),
  installedAt: sqliteCore.integer("installed_at").notNull(),
  activatedAt: sqliteCore.integer("activated_at"),
  lastUpdated: sqliteCore.integer("last_updated").notNull(),
  errorMessage: sqliteCore.text("error_message"),
  createdAt: sqliteCore.integer("created_at").notNull().$defaultFn(() => Math.floor(Date.now() / 1e3)),
  updatedAt: sqliteCore.integer("updated_at").notNull().$defaultFn(() => Math.floor(Date.now() / 1e3))
});
var pluginHooks = sqliteCore.sqliteTable("plugin_hooks", {
  id: sqliteCore.text("id").primaryKey(),
  pluginId: sqliteCore.text("plugin_id").notNull().references(() => plugins.id),
  hookName: sqliteCore.text("hook_name").notNull(),
  handlerName: sqliteCore.text("handler_name").notNull(),
  priority: sqliteCore.integer("priority").notNull().default(10),
  isActive: sqliteCore.integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: sqliteCore.integer("created_at").notNull().$defaultFn(() => Math.floor(Date.now() / 1e3))
});
var pluginRoutes = sqliteCore.sqliteTable("plugin_routes", {
  id: sqliteCore.text("id").primaryKey(),
  pluginId: sqliteCore.text("plugin_id").notNull().references(() => plugins.id),
  path: sqliteCore.text("path").notNull(),
  method: sqliteCore.text("method").notNull(),
  handlerName: sqliteCore.text("handler_name").notNull(),
  middleware: sqliteCore.text("middleware", { mode: "json" }),
  isActive: sqliteCore.integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: sqliteCore.integer("created_at").notNull().$defaultFn(() => Math.floor(Date.now() / 1e3))
});
var pluginAssets = sqliteCore.sqliteTable("plugin_assets", {
  id: sqliteCore.text("id").primaryKey(),
  pluginId: sqliteCore.text("plugin_id").notNull().references(() => plugins.id),
  assetType: sqliteCore.text("asset_type").notNull(),
  // 'css', 'js', 'image', 'font'
  assetPath: sqliteCore.text("asset_path").notNull(),
  loadOrder: sqliteCore.integer("load_order").notNull().default(100),
  loadLocation: sqliteCore.text("load_location").notNull().default("footer"),
  // 'header', 'footer'
  isActive: sqliteCore.integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: sqliteCore.integer("created_at").notNull().$defaultFn(() => Math.floor(Date.now() / 1e3))
});
var pluginActivityLog = sqliteCore.sqliteTable("plugin_activity_log", {
  id: sqliteCore.text("id").primaryKey(),
  pluginId: sqliteCore.text("plugin_id").notNull().references(() => plugins.id),
  action: sqliteCore.text("action").notNull(),
  userId: sqliteCore.text("user_id"),
  details: sqliteCore.text("details", { mode: "json" }),
  timestamp: sqliteCore.integer("timestamp").notNull().$defaultFn(() => Math.floor(Date.now() / 1e3))
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
var systemLogs = sqliteCore.sqliteTable("system_logs", {
  id: sqliteCore.text("id").primaryKey(),
  level: sqliteCore.text("level").notNull(),
  // 'debug', 'info', 'warn', 'error', 'fatal'
  category: sqliteCore.text("category").notNull(),
  // 'auth', 'api', 'workflow', 'plugin', 'media', 'system', etc.
  message: sqliteCore.text("message").notNull(),
  data: sqliteCore.text("data", { mode: "json" }),
  // Additional structured data
  userId: sqliteCore.text("user_id").references(() => users.id),
  sessionId: sqliteCore.text("session_id"),
  requestId: sqliteCore.text("request_id"),
  ipAddress: sqliteCore.text("ip_address"),
  userAgent: sqliteCore.text("user_agent"),
  method: sqliteCore.text("method"),
  // HTTP method for API logs
  url: sqliteCore.text("url"),
  // Request URL for API logs
  statusCode: sqliteCore.integer("status_code"),
  // HTTP status code for API logs
  duration: sqliteCore.integer("duration"),
  // Request duration in milliseconds
  stackTrace: sqliteCore.text("stack_trace"),
  // Error stack trace for error logs
  tags: sqliteCore.text("tags", { mode: "json" }),
  // Array of tags for categorization
  source: sqliteCore.text("source"),
  // Source component/module that generated the log
  createdAt: sqliteCore.integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
});
var logConfig = sqliteCore.sqliteTable("log_config", {
  id: sqliteCore.text("id").primaryKey(),
  category: sqliteCore.text("category").notNull().unique(),
  enabled: sqliteCore.integer("enabled", { mode: "boolean" }).notNull().default(true),
  level: sqliteCore.text("level").notNull().default("info"),
  // minimum log level to store
  retention: sqliteCore.integer("retention").notNull().default(30),
  // days to keep logs
  maxSize: sqliteCore.integer("max_size").default(1e4),
  // max number of logs per category
  createdAt: sqliteCore.integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date()),
  updatedAt: sqliteCore.integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => /* @__PURE__ */ new Date())
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
var forms = sqliteCore.sqliteTable("forms", {
  id: sqliteCore.text("id").primaryKey(),
  name: sqliteCore.text("name").notNull().unique(),
  // Machine name (e.g., "contact-form")
  displayName: sqliteCore.text("display_name").notNull(),
  // Human name (e.g., "Contact Form")
  description: sqliteCore.text("description"),
  category: sqliteCore.text("category").notNull().default("general"),
  // contact, survey, registration, etc.
  // Form.io schema (JSON)
  formioSchema: sqliteCore.text("formio_schema", { mode: "json" }).notNull(),
  // Complete Form.io JSON schema
  // Settings (JSON)
  settings: sqliteCore.text("settings", { mode: "json" }),
  // emailNotifications, successMessage, etc.
  // Status & Management
  isActive: sqliteCore.integer("is_active", { mode: "boolean" }).notNull().default(true),
  isPublic: sqliteCore.integer("is_public", { mode: "boolean" }).notNull().default(true),
  managed: sqliteCore.integer("managed", { mode: "boolean" }).notNull().default(false),
  // Metadata
  icon: sqliteCore.text("icon"),
  color: sqliteCore.text("color"),
  tags: sqliteCore.text("tags", { mode: "json" }),
  // JSON array
  // Stats
  submissionCount: sqliteCore.integer("submission_count").notNull().default(0),
  viewCount: sqliteCore.integer("view_count").notNull().default(0),
  // Ownership
  createdBy: sqliteCore.text("created_by").references(() => users.id),
  updatedBy: sqliteCore.text("updated_by").references(() => users.id),
  // Timestamps
  createdAt: sqliteCore.integer("created_at").notNull(),
  updatedAt: sqliteCore.integer("updated_at").notNull()
});
var formSubmissions = sqliteCore.sqliteTable("form_submissions", {
  id: sqliteCore.text("id").primaryKey(),
  formId: sqliteCore.text("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
  // Submission data
  submissionData: sqliteCore.text("submission_data", { mode: "json" }).notNull(),
  // The actual form data
  // Submission metadata
  status: sqliteCore.text("status").notNull().default("pending"),
  // pending, reviewed, approved, rejected, spam
  submissionNumber: sqliteCore.integer("submission_number"),
  // User information
  userId: sqliteCore.text("user_id").references(() => users.id),
  userEmail: sqliteCore.text("user_email"),
  // Tracking
  ipAddress: sqliteCore.text("ip_address"),
  userAgent: sqliteCore.text("user_agent"),
  referrer: sqliteCore.text("referrer"),
  utmSource: sqliteCore.text("utm_source"),
  utmMedium: sqliteCore.text("utm_medium"),
  utmCampaign: sqliteCore.text("utm_campaign"),
  // Review/Processing
  reviewedBy: sqliteCore.text("reviewed_by").references(() => users.id),
  reviewedAt: sqliteCore.integer("reviewed_at"),
  reviewNotes: sqliteCore.text("review_notes"),
  // Flags
  isSpam: sqliteCore.integer("is_spam", { mode: "boolean" }).notNull().default(false),
  isArchived: sqliteCore.integer("is_archived", { mode: "boolean" }).notNull().default(false),
  // Content integration
  contentId: sqliteCore.text("content_id").references(() => content.id),
  // Links submission to its content item
  // Timestamps
  submittedAt: sqliteCore.integer("submitted_at").notNull(),
  updatedAt: sqliteCore.integer("updated_at").notNull()
});
var formFiles = sqliteCore.sqliteTable("form_files", {
  id: sqliteCore.text("id").primaryKey(),
  submissionId: sqliteCore.text("submission_id").notNull().references(() => formSubmissions.id, { onDelete: "cascade" }),
  mediaId: sqliteCore.text("media_id").notNull().references(() => media.id, { onDelete: "cascade" }),
  fieldName: sqliteCore.text("field_name").notNull(),
  // Form field that uploaded this file
  uploadedAt: sqliteCore.integer("uploaded_at").notNull()
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
    this.db = d1.drizzle(database);
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
   * Get logs with filtering and pagination
   */
  async getLogs(filter = {}) {
    try {
      const conditions = [];
      if (filter.level && filter.level.length > 0) {
        conditions.push(drizzleOrm.inArray(systemLogs.level, filter.level));
      }
      if (filter.category && filter.category.length > 0) {
        conditions.push(drizzleOrm.inArray(systemLogs.category, filter.category));
      }
      if (filter.userId) {
        conditions.push(drizzleOrm.eq(systemLogs.userId, filter.userId));
      }
      if (filter.source) {
        conditions.push(drizzleOrm.eq(systemLogs.source, filter.source));
      }
      if (filter.search) {
        conditions.push(
          drizzleOrm.like(systemLogs.message, `%${filter.search}%`)
        );
      }
      if (filter.startDate) {
        conditions.push(drizzleOrm.gte(systemLogs.createdAt, filter.startDate));
      }
      if (filter.endDate) {
        conditions.push(drizzleOrm.lte(systemLogs.createdAt, filter.endDate));
      }
      const whereClause = conditions.length > 0 ? drizzleOrm.and(...conditions) : void 0;
      const totalResult = await this.db.select({ count: drizzleOrm.count() }).from(systemLogs).where(whereClause);
      const total = totalResult[0]?.count || 0;
      const sortColumn = filter.sortBy === "level" ? systemLogs.level : filter.sortBy === "category" ? systemLogs.category : systemLogs.createdAt;
      const sortFn = filter.sortOrder === "asc" ? drizzleOrm.asc : drizzleOrm.desc;
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
      const configs = await this.db.select().from(logConfig).where(drizzleOrm.eq(logConfig.category, category));
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
      }).where(drizzleOrm.eq(logConfig.category, category));
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
      const countResult = await this.db.select({ count: drizzleOrm.count() }).from(systemLogs).where(drizzleOrm.eq(systemLogs.category, category));
      const currentCount = countResult[0]?.count || 0;
      if (currentCount > maxSize) {
        const cutoffLogs = await this.db.select({ createdAt: systemLogs.createdAt }).from(systemLogs).where(drizzleOrm.eq(systemLogs.category, category)).orderBy(drizzleOrm.desc(systemLogs.createdAt)).limit(1).offset(maxSize - 1);
        if (cutoffLogs[0]) {
          await this.db.delete(systemLogs).where(
            drizzleOrm.and(
              drizzleOrm.eq(systemLogs.category, category),
              drizzleOrm.lte(systemLogs.createdAt, cutoffLogs[0].createdAt)
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
            drizzleOrm.and(
              drizzleOrm.eq(systemLogs.category, config.category),
              drizzleOrm.lte(systemLogs.createdAt, cutoffDate)
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

// src/services/cache.ts
var CacheService = class {
  config;
  memoryCache = /* @__PURE__ */ new Map();
  constructor(config) {
    this.config = config;
  }
  /**
   * Generate cache key with prefix
   */
  generateKey(type, identifier) {
    const parts = [this.config.keyPrefix, type];
    if (identifier) {
      parts.push(identifier);
    }
    return parts.join(":");
  }
  /**
   * Get value from cache
   */
  async get(key) {
    const cached = this.memoryCache.get(key);
    if (!cached) {
      return null;
    }
    if (Date.now() > cached.expires) {
      this.memoryCache.delete(key);
      return null;
    }
    return cached.value;
  }
  /**
   * Get value from cache with source information
   */
  async getWithSource(key) {
    const cached = this.memoryCache.get(key);
    if (!cached) {
      return {
        hit: false,
        data: null,
        source: "none"
      };
    }
    if (Date.now() > cached.expires) {
      this.memoryCache.delete(key);
      return {
        hit: false,
        data: null,
        source: "expired"
      };
    }
    return {
      hit: true,
      data: cached.value,
      source: "memory",
      ttl: (cached.expires - Date.now()) / 1e3
      // TTL in seconds
    };
  }
  /**
   * Set value in cache
   */
  async set(key, value, ttl) {
    const expires = Date.now() + (ttl || this.config.ttl) * 1e3;
    this.memoryCache.set(key, { value, expires });
  }
  /**
   * Delete specific key from cache
   */
  async delete(key) {
    this.memoryCache.delete(key);
  }
  /**
   * Invalidate cache keys matching a pattern
   * For memory cache, we do simple string matching
   */
  async invalidate(pattern) {
    const regexPattern = pattern.replace(/\*/g, ".*").replace(/\?/g, ".");
    const regex = new RegExp(`^${regexPattern}$`);
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }
  /**
   * Clear all cache
   */
  async clear() {
    this.memoryCache.clear();
  }
  /**
   * Get value from cache or set it using a callback
   */
  async getOrSet(key, callback, ttl) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }
    const value = await callback();
    await this.set(key, value, ttl);
    return value;
  }
};
var CACHE_CONFIGS = {
  api: {
    ttl: 300,
    // 5 minutes
    keyPrefix: "api"
  },
  user: {
    ttl: 600,
    // 10 minutes
    keyPrefix: "user"
  },
  content: {
    ttl: 300,
    // 5 minutes
    keyPrefix: "content"
  },
  collection: {
    ttl: 600,
    // 10 minutes
    keyPrefix: "collection"
  }
};
function getCacheService(config) {
  return new CacheService(config);
}

// src/services/settings.ts
var SettingsService = class {
  constructor(db) {
    this.db = db;
  }
  /**
   * Get a setting value by category and key
   */
  async getSetting(category, key) {
    try {
      const result = await this.db.prepare("SELECT value FROM settings WHERE category = ? AND key = ?").bind(category, key).first();
      if (!result) {
        return null;
      }
      return JSON.parse(result.value);
    } catch (error) {
      console.error(`Error getting setting ${category}.${key}:`, error);
      return null;
    }
  }
  /**
   * Get all settings for a category
   */
  async getCategorySettings(category) {
    try {
      const { results } = await this.db.prepare("SELECT key, value FROM settings WHERE category = ?").bind(category).all();
      const settings = {};
      for (const row of results || []) {
        const r = row;
        settings[r.key] = JSON.parse(r.value);
      }
      return settings;
    } catch (error) {
      console.error(`Error getting category settings for ${category}:`, error);
      return {};
    }
  }
  /**
   * Set a setting value
   */
  async setSetting(category, key, value) {
    try {
      const now = Date.now();
      const jsonValue = JSON.stringify(value);
      await this.db.prepare(`
          INSERT INTO settings (id, category, key, value, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(category, key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
        `).bind(crypto.randomUUID(), category, key, jsonValue, now, now).run();
      return true;
    } catch (error) {
      console.error(`Error setting ${category}.${key}:`, error);
      return false;
    }
  }
  /**
   * Set multiple settings at once
   */
  async setMultipleSettings(category, settings) {
    try {
      const now = Date.now();
      for (const [key, value] of Object.entries(settings)) {
        const jsonValue = JSON.stringify(value);
        await this.db.prepare(`
            INSERT INTO settings (id, category, key, value, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(category, key) DO UPDATE SET
              value = excluded.value,
              updated_at = excluded.updated_at
          `).bind(crypto.randomUUID(), category, key, jsonValue, now, now).run();
      }
      return true;
    } catch (error) {
      console.error(`Error setting multiple settings for ${category}:`, error);
      return false;
    }
  }
  /**
   * Get general settings with defaults
   */
  async getGeneralSettings(userEmail) {
    const settings = await this.getCategorySettings("general");
    return {
      siteName: settings.siteName || "SonicJS AI",
      siteDescription: settings.siteDescription || "A modern headless CMS powered by AI",
      adminEmail: settings.adminEmail || userEmail || "admin@example.com",
      timezone: settings.timezone || "UTC",
      language: settings.language || "en",
      maintenanceMode: settings.maintenanceMode || false
    };
  }
  /**
   * Save general settings
   */
  async saveGeneralSettings(settings) {
    const settingsToSave = {};
    if (settings.siteName !== void 0) settingsToSave.siteName = settings.siteName;
    if (settings.siteDescription !== void 0) settingsToSave.siteDescription = settings.siteDescription;
    if (settings.adminEmail !== void 0) settingsToSave.adminEmail = settings.adminEmail;
    if (settings.timezone !== void 0) settingsToSave.timezone = settings.timezone;
    if (settings.language !== void 0) settingsToSave.language = settings.language;
    if (settings.maintenanceMode !== void 0) settingsToSave.maintenanceMode = settings.maintenanceMode;
    return await this.setMultipleSettings("general", settingsToSave);
  }
};

// src/services/telemetry-service.ts
var TelemetryService = class {
  config;
  identity = null;
  enabled = true;
  eventQueue = [];
  isInitialized = false;
  constructor(config) {
    this.config = {
      ...chunkP3XDZL6Q_cjs.getTelemetryConfig(),
      ...config
    };
    this.enabled = this.config.enabled;
  }
  /**
   * Initialize the telemetry service
   */
  async initialize(identity) {
    if (!this.enabled) {
      if (this.config.debug) {
        console.log("[Telemetry] Disabled via configuration");
      }
      return;
    }
    try {
      this.identity = identity;
      if (this.config.debug) {
        console.log("[Telemetry] Initialized with installation ID:", identity.installationId);
      }
      this.isInitialized = true;
      await this.flushQueue();
    } catch (error) {
      if (this.config.debug) {
        console.error("[Telemetry] Initialization failed:", error);
      }
      this.enabled = false;
    }
  }
  /**
   * Track a telemetry event
   */
  async track(event, properties) {
    if (!this.enabled) return;
    try {
      const sanitizedProps = this.sanitizeProperties(properties);
      const enrichedProps = {
        ...sanitizedProps,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        version: this.getVersion()
      };
      if (!this.isInitialized) {
        this.eventQueue.push({ event, properties: enrichedProps });
        if (this.config.debug) {
          console.log("[Telemetry] Queued event:", event, enrichedProps);
        }
        return;
      }
      if (this.identity && this.config.host) {
        const payload = {
          data: {
            installation_id: this.identity.installationId,
            event_type: event,
            properties: enrichedProps,
            timestamp: enrichedProps.timestamp
          }
        };
        fetch(`${this.config.host}/v1/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).catch(() => {
        });
        if (this.config.debug) {
          console.log("[Telemetry] Tracked event:", event, enrichedProps);
        }
      } else if (this.config.debug) {
        console.log("[Telemetry] Event (no endpoint):", event, enrichedProps);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error("[Telemetry] Failed to track event:", error);
      }
    }
  }
  /**
   * Track installation started
   */
  async trackInstallationStarted(properties) {
    await this.track("installation_started", properties);
  }
  /**
   * Track installation completed
   */
  async trackInstallationCompleted(properties) {
    await this.track("installation_completed", properties);
  }
  /**
   * Track installation failed
   */
  async trackInstallationFailed(error, properties) {
    await this.track("installation_failed", {
      ...properties,
      errorType: chunkP3XDZL6Q_cjs.sanitizeErrorMessage(error)
    });
  }
  /**
   * Track dev server started
   */
  async trackDevServerStarted(properties) {
    await this.track("dev_server_started", properties);
  }
  /**
   * Track page view in admin UI
   */
  async trackPageView(route, properties) {
    await this.track("page_viewed", {
      ...properties,
      route: chunkP3XDZL6Q_cjs.sanitizeRoute(route)
    });
  }
  /**
   * Track error (sanitized)
   */
  async trackError(error, properties) {
    await this.track("error_occurred", {
      ...properties,
      errorType: chunkP3XDZL6Q_cjs.sanitizeErrorMessage(error)
    });
  }
  /**
   * Track plugin activation
   */
  async trackPluginActivated(properties) {
    await this.track("plugin_activated", properties);
  }
  /**
   * Track migration run
   */
  async trackMigrationRun(properties) {
    await this.track("migration_run", properties);
  }
  /**
   * Flush queued events
   */
  async flushQueue() {
    if (this.eventQueue.length === 0) return;
    const queue = [...this.eventQueue];
    this.eventQueue = [];
    for (const { event, properties } of queue) {
      await this.track(event, properties);
    }
  }
  /**
   * Sanitize properties to ensure no PII
   */
  sanitizeProperties(properties) {
    if (!properties) return {};
    const sanitized = {};
    for (const [key, value] of Object.entries(properties)) {
      if (value === void 0) continue;
      if (key === "route" && typeof value === "string") {
        sanitized[key] = chunkP3XDZL6Q_cjs.sanitizeRoute(value);
        continue;
      }
      if (key.toLowerCase().includes("error") && typeof value === "string") {
        sanitized[key] = chunkP3XDZL6Q_cjs.sanitizeErrorMessage(value);
        continue;
      }
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  /**
   * Get SonicJS version
   */
  getVersion() {
    try {
      if (typeof process !== "undefined" && process.env) {
        return process.env.SONICJS_VERSION || "2.0.0";
      }
      return "2.0.0";
    } catch {
      return "unknown";
    }
  }
  /**
   * Shutdown the telemetry service (no-op for fetch-based telemetry)
   */
  async shutdown() {
  }
  /**
   * Enable telemetry
   */
  enable() {
    this.enabled = true;
  }
  /**
   * Disable telemetry
   */
  disable() {
    this.enabled = false;
  }
  /**
   * Check if telemetry is enabled
   */
  isEnabled() {
    return this.enabled;
  }
};
var telemetryInstance = null;
function getTelemetryService(config) {
  if (!telemetryInstance) {
    telemetryInstance = new TelemetryService(config);
  }
  return telemetryInstance;
}
async function initTelemetry(identity, config) {
  const service = getTelemetryService(config);
  await service.initialize(identity);
  return service;
}
function createInstallationIdentity(projectName) {
  const installationId = chunkP3XDZL6Q_cjs.generateInstallationId();
  const identity = { installationId };
  if (projectName) {
    identity.projectId = chunkP3XDZL6Q_cjs.generateProjectId(projectName);
  }
  return identity;
}
var appInstance = null;
function setAppInstance(app) {
  appInstance = app;
}
function getAppInstance() {
  return appInstance;
}
var CATEGORY_INFO = {
  "Auth": {
    title: "Authentication",
    description: "User authentication and authorization endpoints",
    icon: "&#x1f510;"
  },
  "Content": {
    title: "Content Management",
    description: "Content creation, retrieval, and management",
    icon: "&#x1f4dd;"
  },
  "Media": {
    title: "Media Management",
    description: "File upload, storage, and media operations",
    icon: "&#x1f5bc;&#xfe0f;"
  },
  "Admin": {
    title: "Admin Interface",
    description: "Administrative panel and management features",
    icon: "&#x2699;&#xfe0f;"
  },
  "System": {
    title: "System",
    description: "Health checks and system information",
    icon: "&#x1f527;"
  },
  "Search": {
    title: "Search",
    description: "AI-powered search, full-text search, and analytics",
    icon: "&#x1f50d;"
  },
  "API Keys": {
    title: "API Keys",
    description: "API key management and authentication",
    icon: "&#x1f511;"
  },
  "Workflow": {
    title: "Workflow",
    description: "Content workflow and approval processes",
    icon: "&#x1f504;"
  },
  "Cache": {
    title: "Cache",
    description: "Cache management and invalidation",
    icon: "&#x26a1;"
  },
  "Forms": {
    title: "Forms",
    description: "Form submissions and management",
    icon: "&#x1f4cb;"
  },
  "Files": {
    title: "Files",
    description: "File serving from R2 storage",
    icon: "&#x1f4c1;"
  }
};
var ROUTE_METADATA = {
  // ── Auth ──────────────────────────────────────────────────────────────
  "POST /auth/login": { description: "Authenticate user with email and password (returns JWT)", category: "Auth", authentication: false },
  "POST /auth/login/form": { description: "Form-based login (sets session cookie)", category: "Auth", authentication: false },
  "POST /auth/register": { description: "Register a new user account", category: "Auth", authentication: false },
  "POST /auth/register/form": { description: "Form-based registration (sets session cookie)", category: "Auth", authentication: false },
  "POST /auth/logout": { description: "Log out the current user and invalidate session", category: "Auth", authentication: true },
  "GET /auth/me": { description: "Get current authenticated user information", category: "Auth", authentication: true },
  "POST /auth/refresh": { description: "Refresh authentication token", category: "Auth", authentication: true },
  "POST /auth/seed-admin": { description: "Create or reset the admin user account", category: "Auth", authentication: false },
  "POST /auth/accept-invitation": { description: "Accept a user invitation", category: "Auth", authentication: false },
  "POST /auth/request-password-reset": { description: "Request a password reset email", category: "Auth", authentication: false },
  "POST /auth/reset-password": { description: "Reset password with reset token", category: "Auth", authentication: false },
  "POST /auth/magic-link/request": { description: "Request a magic link login email", category: "Auth", authentication: false },
  "GET /auth/magic-link/verify": { description: "Verify magic link token and authenticate", category: "Auth", authentication: false },
  "POST /auth/otp/request": { description: "Request a one-time password via email", category: "Auth", authentication: false },
  "POST /auth/otp/verify": { description: "Verify OTP code and authenticate", category: "Auth", authentication: false },
  "POST /auth/otp/resend": { description: "Resend a one-time password", category: "Auth", authentication: false },
  // ── Content (Public API) ─────────────────────────────────────────────
  "GET /api": { description: "OpenAPI 3.0 specification (auto-discovered)", category: "System", authentication: false },
  "GET /api/health": { description: "API health check with schema information", category: "System", authentication: false },
  "GET /api/collections": { description: "List all available collections", category: "Content", authentication: false },
  "GET /api/collections/:collection/content": { description: "Get content items from a specific collection", category: "Content", authentication: false },
  "GET /api/content": { description: "List content items with advanced filtering", category: "Content", authentication: false },
  "GET /api/content/check-slug": { description: "Check if a content slug is available", category: "Content", authentication: false },
  "GET /api/content/:id": { description: "Get a specific content item by ID", category: "Content", authentication: false },
  "POST /api/content": { description: "Create a new content item", category: "Content", authentication: true },
  "PUT /api/content/:id": { description: "Update an existing content item", category: "Content", authentication: true },
  "DELETE /api/content/:id": { description: "Delete a content item", category: "Content", authentication: true },
  // ── Media (Public API) ───────────────────────────────────────────────
  "POST /api/media/upload": { description: "Upload a media file to R2 storage", category: "Media", authentication: true },
  "POST /api/media/upload-multiple": { description: "Upload multiple media files", category: "Media", authentication: true },
  "POST /api/media/bulk-delete": { description: "Delete multiple media files", category: "Media", authentication: true },
  "POST /api/media/create-folder": { description: "Create a folder in media storage", category: "Media", authentication: true },
  "POST /api/media/bulk-move": { description: "Move multiple media files to a folder", category: "Media", authentication: true },
  "DELETE /api/media/:id": { description: "Delete a media file from storage", category: "Media", authentication: true },
  "PATCH /api/media/:id": { description: "Update media file metadata", category: "Media", authentication: true },
  // ── System ───────────────────────────────────────────────────────────
  "GET /health": { description: "Health check endpoint for monitoring", category: "System", authentication: false },
  "GET /api/system/info": { description: "Get system information and version", category: "System", authentication: false },
  "GET /api/system/schema": { description: "Get database schema information", category: "System", authentication: false },
  // ── Search (Public API) ──────────────────────────────────────────────
  "POST /api/search": { description: "Search content using AI, FTS5, keyword, or hybrid mode", category: "Search", authentication: false },
  "GET /api/search/suggest": { description: "Get search suggestions and autocomplete", category: "Search", authentication: false },
  "POST /api/search/click": { description: "Track a search result click for analytics", category: "Search", authentication: false },
  "POST /api/search/facet-click": { description: "Track a facet interaction for analytics", category: "Search", authentication: false },
  "GET /api/search/analytics": { description: "Get public search analytics", category: "Search", authentication: false },
  "GET /api/search/related": { description: "Get related searches for a query", category: "Search", authentication: false },
  "GET /api/search/trending": { description: "Get trending search queries", category: "Search", authentication: false },
  // ── Search Admin ─────────────────────────────────────────────────────
  "GET /admin/plugins/ai-search/api/settings": { description: "Get search plugin settings", category: "Search", authentication: true },
  "GET /admin/plugins/ai-search/api/new-collections": { description: "Get collections not yet indexed", category: "Search", authentication: true },
  "GET /admin/plugins/ai-search/api/status": { description: "Get search plugin status and configuration", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/reindex": { description: "Trigger full content reindex", category: "Search", authentication: true },
  "GET /admin/plugins/ai-search/api/fts5/status": { description: "Get FTS5 full-text search status", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/fts5/index-collection": { description: "Index a collection for FTS5 search", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/fts5/reindex-all": { description: "Rebuild entire FTS5 search index", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/vectorize/reindex-all": { description: "Rebuild entire Vectorize semantic index", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/relevance/preview": { description: "Preview relevance pipeline results", category: "Search", authentication: true },
  "GET /admin/plugins/ai-search/api/relevance/pipeline": { description: "Get relevance pipeline configuration", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/relevance/pipeline": { description: "Update relevance pipeline configuration", category: "Search", authentication: true },
  "GET /admin/plugins/ai-search/api/relevance/content-scores": { description: "Get content boost scores", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/relevance/content-scores": { description: "Set content boost scores", category: "Search", authentication: true },
  "DELETE /admin/plugins/ai-search/api/relevance/content-scores": { description: "Clear content boost scores", category: "Search", authentication: true },
  "GET /admin/plugins/ai-search/api/relevance/synonyms": { description: "List search synonyms", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/relevance/synonyms": { description: "Add a search synonym", category: "Search", authentication: true },
  "PUT /admin/plugins/ai-search/api/relevance/synonyms/:id": { description: "Update a search synonym", category: "Search", authentication: true },
  "DELETE /admin/plugins/ai-search/api/relevance/synonyms/:id": { description: "Delete a search synonym", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/relevance/synonyms/import": { description: "Import synonyms from file", category: "Search", authentication: true },
  "GET /admin/plugins/ai-search/api/relevance/rules": { description: "List search query rules", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/relevance/rules": { description: "Create a query rule", category: "Search", authentication: true },
  "PUT /admin/plugins/ai-search/api/relevance/rules/:id": { description: "Update a query rule", category: "Search", authentication: true },
  "DELETE /admin/plugins/ai-search/api/relevance/rules/:id": { description: "Delete a query rule", category: "Search", authentication: true },
  "GET /admin/plugins/ai-search/api/related-searches": { description: "List related search mappings", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/related-searches": { description: "Create a related search mapping", category: "Search", authentication: true },
  "PUT /admin/plugins/ai-search/api/related-searches/:id": { description: "Update a related search mapping", category: "Search", authentication: true },
  "DELETE /admin/plugins/ai-search/api/related-searches/cache": { description: "Clear related searches cache", category: "Search", authentication: true },
  "DELETE /admin/plugins/ai-search/api/related-searches/:id": { description: "Delete a related search mapping", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/related-searches/bulk": { description: "Bulk import related searches", category: "Search", authentication: true },
  "GET /admin/plugins/ai-search/api/facets/discover": { description: "Discover available facets from content", category: "Search", authentication: true },
  "GET /admin/plugins/ai-search/api/facets/config": { description: "Get facet configuration", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/facets/config": { description: "Update facet configuration", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/facets/auto-generate": { description: "Auto-generate facet configuration", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/seed/clicks": { description: "Generate seed click data for testing", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/seed/facet-clicks": { description: "Generate seed facet click data", category: "Search", authentication: true },
  "DELETE /admin/plugins/ai-search/api/seed/clicks": { description: "Clear seeded click data", category: "Search", authentication: true },
  "DELETE /admin/plugins/ai-search/api/seed/facet-clicks": { description: "Clear seeded facet click data", category: "Search", authentication: true },
  "GET /admin/plugins/ai-search/api/analytics/extended": { description: "Get extended search analytics", category: "Search", authentication: true },
  "GET /admin/plugins/ai-search/api/benchmark/datasets": { description: "List available benchmark datasets", category: "Search", authentication: true },
  "GET /admin/plugins/ai-search/api/benchmark/status": { description: "Get benchmark status", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/benchmark/seed": { description: "Seed benchmark dataset", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/benchmark/purge": { description: "Purge benchmark data", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/benchmark/index-fts5-batch": { description: "Index benchmark data for FTS5", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/benchmark/index-vectorize-batch": { description: "Batch index benchmark data for Vectorize", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/benchmark/index-vectorize": { description: "Index benchmark data for Vectorize", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/benchmark/evaluate": { description: "Evaluate search quality against benchmark", category: "Search", authentication: true },
  "GET /admin/plugins/ai-search/api/benchmark/query-ids": { description: "Get benchmark query IDs", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/benchmark/evaluate-batch": { description: "Batch evaluate search quality", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/agent/run": { description: "Run search quality analysis", category: "Search", authentication: true },
  "GET /admin/plugins/ai-search/api/agent/status": { description: "Get quality agent status", category: "Search", authentication: true },
  "GET /admin/plugins/ai-search/api/agent/recommendations": { description: "Get quality improvement recommendations", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/agent/recommendations/:id/apply": { description: "Apply a quality recommendation", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/agent/recommendations/:id/dismiss": { description: "Dismiss a quality recommendation", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/agent/recommendations/dismiss-all": { description: "Dismiss all quality recommendations", category: "Search", authentication: true },
  "GET /admin/plugins/ai-search/api/agent/runs": { description: "Get history of quality agent runs", category: "Search", authentication: true },
  "GET /admin/plugins/ai-search/api/experiments": { description: "List search A/B test experiments", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/experiments": { description: "Create a search A/B test experiment", category: "Search", authentication: true },
  "GET /admin/plugins/ai-search/api/experiments/:id": { description: "Get experiment details", category: "Search", authentication: true },
  "PUT /admin/plugins/ai-search/api/experiments/:id": { description: "Update an experiment", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/experiments/:id/start": { description: "Start an experiment", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/experiments/:id/pause": { description: "Pause a running experiment", category: "Search", authentication: true },
  "POST /admin/plugins/ai-search/api/experiments/:id/complete": { description: "Complete an experiment", category: "Search", authentication: true },
  "DELETE /admin/plugins/ai-search/api/experiments/:id": { description: "Delete an experiment", category: "Search", authentication: true },
  "GET /admin/plugins/ai-search/api/experiments/:id/metrics": { description: "Get experiment metrics and statistics", category: "Search", authentication: true },
  // ── Admin API ────────────────────────────────────────────────────────
  "GET /admin/api/stats": { description: "Get dashboard statistics (collections, content, media, users)", category: "Admin", authentication: true },
  "GET /admin/api/storage": { description: "Get storage usage information", category: "Admin", authentication: true },
  "GET /admin/api/activity": { description: "Get recent activity logs", category: "Admin", authentication: true },
  "GET /admin/api/collections": { description: "List all collections with field counts", category: "Admin", authentication: true },
  "GET /admin/api/collections/:id": { description: "Get a collection with its fields", category: "Admin", authentication: true },
  "GET /admin/api/references": { description: "Get reference options for a collection", category: "Admin", authentication: true },
  "POST /admin/api/collections": { description: "Create a new collection", category: "Admin", authentication: true },
  "PATCH /admin/api/collections/:id": { description: "Update an existing collection", category: "Admin", authentication: true },
  "DELETE /admin/api/collections/:id": { description: "Delete a collection", category: "Admin", authentication: true },
  "GET /admin/api/migrations/status": { description: "Get database migration status", category: "Admin", authentication: true },
  "POST /admin/api/migrations/run": { description: "Run pending database migrations", category: "Admin", authentication: true },
  "GET /admin/api/migrations/validate": { description: "Validate database migration integrity", category: "Admin", authentication: true },
  // ── API Keys ─────────────────────────────────────────────────────────
  "GET /admin/api-keys": { description: "List all API keys", category: "API Keys", authentication: true },
  "POST /admin/api-keys": { description: "Create a new API key", category: "API Keys", authentication: true },
  "PATCH /admin/api-keys/:id": { description: "Update an API key", category: "API Keys", authentication: true },
  "DELETE /admin/api-keys/:id": { description: "Revoke an API key", category: "API Keys", authentication: true },
  // ── Cache ────────────────────────────────────────────────────────────
  "GET /admin/cache/stats": { description: "Get cache statistics", category: "Cache", authentication: true },
  "GET /admin/cache/stats/:namespace": { description: "Get cache statistics for a namespace", category: "Cache", authentication: true },
  "POST /admin/cache/clear": { description: "Clear all cache entries", category: "Cache", authentication: true },
  "POST /admin/cache/clear/:namespace": { description: "Clear cache entries for a namespace", category: "Cache", authentication: true },
  "POST /admin/cache/invalidate": { description: "Invalidate cache entries by pattern", category: "Cache", authentication: true },
  "GET /admin/cache/health": { description: "Get cache health status", category: "Cache", authentication: true },
  "GET /admin/cache/browser/:namespace/:key": { description: "Get a specific cache entry", category: "Cache", authentication: true },
  "GET /admin/cache/analytics": { description: "Get cache analytics overview", category: "Cache", authentication: true },
  "GET /admin/cache/analytics/trends": { description: "Get cache usage trends over time", category: "Cache", authentication: true },
  "GET /admin/cache/analytics/top-keys": { description: "Get most frequently accessed cache keys", category: "Cache", authentication: true },
  "POST /admin/cache/warm": { description: "Warm cache with data", category: "Cache", authentication: true },
  "POST /admin/cache/warm/:namespace": { description: "Warm cache for a specific namespace", category: "Cache", authentication: true },
  // ── Workflow ─────────────────────────────────────────────────────────
  "GET /workflow/status/:id": { description: "Get workflow status for a content item", category: "Workflow", authentication: true },
  "POST /workflow/submit/:id": { description: "Submit content for review", category: "Workflow", authentication: true },
  "POST /workflow/approve/:id": { description: "Approve content in review", category: "Workflow", authentication: true },
  "POST /workflow/reject/:id": { description: "Reject content in review", category: "Workflow", authentication: true },
  "POST /workflow/publish/:id": { description: "Publish approved content", category: "Workflow", authentication: true },
  "POST /workflow/unpublish/:id": { description: "Unpublish content", category: "Workflow", authentication: true },
  "GET /workflow/history/:id": { description: "Get workflow history for a content item", category: "Workflow", authentication: true },
  // ── Forms (Public) ───────────────────────────────────────────────────
  "GET /forms/:identifier/turnstile-config": { description: "Get Turnstile CAPTCHA config for a form", category: "Forms", authentication: false },
  "GET /forms/:identifier/schema": { description: "Get form schema for client-side rendering", category: "Forms", authentication: false },
  "GET /forms/:name": { description: "Get form definition for rendering", category: "Forms", authentication: false },
  "POST /forms/:identifier/submit": { description: "Submit a form (public endpoint)", category: "Forms", authentication: false },
  "GET /api/forms/:identifier/turnstile-config": { description: "Get Turnstile config via API", category: "Forms", authentication: false },
  "GET /api/forms/:identifier/schema": { description: "Get form schema via API", category: "Forms", authentication: false },
  "GET /api/forms/:name": { description: "Get form definition via API", category: "Forms", authentication: false },
  "POST /api/forms/:identifier/submit": { description: "Submit a form via API", category: "Forms", authentication: false },
  // ── Files ────────────────────────────────────────────────────────────
  "GET /files/*": { description: "Serve files from R2 storage (public access)", category: "Files", authentication: false },
  // ── Database Tools ───────────────────────────────────────────────────
  "GET /admin/database-tools/api/stats": { description: "Get database statistics", category: "Admin", authentication: true },
  "POST /admin/database-tools/api/truncate": { description: "Truncate database tables", category: "Admin", authentication: true },
  "POST /admin/database-tools/api/backup": { description: "Create a database backup", category: "Admin", authentication: true },
  "GET /admin/database-tools/api/validate": { description: "Validate database integrity", category: "Admin", authentication: true },
  "GET /admin/database-tools/api/tables/:tableName": { description: "Get table schema and sample data", category: "Admin", authentication: true },
  "GET /admin/database-tools/tables/:tableName": { description: "Get table details", category: "Admin", authentication: true },
  // ── Seed Data ────────────────────────────────────────────────────────
  "POST /admin/seed-data/settings": { description: "Update seed data settings", category: "Admin", authentication: true },
  "POST /admin/seed-data/generate/users": { description: "Generate seed users", category: "Admin", authentication: true },
  "POST /admin/seed-data/generate/content": { description: "Generate seed content", category: "Admin", authentication: true },
  "POST /admin/seed-data/generate/forms": { description: "Generate seed forms", category: "Admin", authentication: true },
  "POST /admin/seed-data/generate/submissions": { description: "Generate seed form submissions", category: "Admin", authentication: true },
  "POST /admin/seed-data/generate": { description: "Generate all seed data", category: "Admin", authentication: true },
  "POST /admin/seed-data/clear": { description: "Clear all seed data", category: "Admin", authentication: true },
  // ── Email Plugin ─────────────────────────────────────────────────────
  "POST /admin/plugins/email/settings": { description: "Update email plugin settings", category: "Admin", authentication: true },
  "POST /admin/plugins/email/test": { description: "Send a test email", category: "Admin", authentication: true }
};
var INCLUDED_ROUTE_PATTERNS = [
  /^\/api\//,
  // All /api/* routes
  /^\/api$/,
  // API root
  /^\/auth\//,
  // All auth routes (HTML pages excluded below)
  /^\/admin\/api\//,
  // Admin API endpoints
  /^\/admin\/api-keys/,
  // API key management (no /api/ segment)
  /^\/admin\/cache\//,
  // Cache management (no /api/ segment)
  /^\/admin\/plugins\/.*\/api\//,
  // Plugin API endpoints (with /api/ segment)
  /^\/admin\/plugins\/email\//,
  // Email plugin (no /api/ segment)
  /^\/admin\/database-tools\//,
  // Database tools (mixed /api/ and non-/api/)
  /^\/admin\/seed-data\//,
  // Seed data (no /api/ segment)
  /^\/workflow\//,
  // Workflow endpoints
  /^\/health$/,
  // Health check
  /^\/files\//,
  // File serving
  /^\/forms\//
  // Public form endpoints
];
var EXCLUDED_ROUTES = /* @__PURE__ */ new Set([
  "GET /auth/login",
  "GET /auth/register",
  "GET /auth/login/form",
  "GET /auth/accept-invitation",
  "GET /auth/reset-password",
  "GET /auth/logout",
  "GET /admin/cache/browser"
  // Cache browser HTML page
]);
var cachedRouteList = null;
function isIncludedRoute(method, path) {
  const key = `${method} ${path}`;
  if (EXCLUDED_ROUTES.has(key)) {
    return false;
  }
  return INCLUDED_ROUTE_PATTERNS.some((pattern) => pattern.test(path));
}
function inferCategory(path) {
  if (path.startsWith("/auth/")) return "Auth";
  if (path.startsWith("/api/search")) return "Search";
  if (path.startsWith("/api/media")) return "Media";
  if (path.startsWith("/api/system")) return "System";
  if (path.startsWith("/api/content") || path.startsWith("/api/collections")) return "Content";
  if (path.startsWith("/api/forms")) return "Forms";
  if (path.startsWith("/admin/api-keys")) return "API Keys";
  if (path.startsWith("/admin/cache")) return "Cache";
  if (path.startsWith("/admin/plugins/ai-search")) return "Search";
  if (path.startsWith("/admin/api")) return "Admin";
  if (path.startsWith("/admin/database-tools")) return "Admin";
  if (path.startsWith("/admin/seed-data")) return "Admin";
  if (path.startsWith("/admin/plugins/email")) return "Admin";
  if (path.startsWith("/workflow/")) return "Workflow";
  if (path.startsWith("/forms/")) return "Forms";
  if (path.startsWith("/files/")) return "Files";
  if (path === "/health" || path.startsWith("/api")) return "System";
  return "Other";
}
function inferAuth(path) {
  if (path === "/health" || path === "/api" || path === "/api/health") return false;
  if (path === "/api/system/info" || path === "/api/system/schema") return false;
  if (path.startsWith("/files/")) return false;
  if (path.startsWith("/forms/") || path.startsWith("/api/forms/")) return false;
  if (path.startsWith("/admin/")) return true;
  if (path.startsWith("/workflow/")) return true;
  return "unknown";
}
function buildRouteList(app) {
  if (cachedRouteList) return cachedRouteList;
  if (!app) return [];
  try {
    const routes = dev.inspectRoutes(app);
    const seen = /* @__PURE__ */ new Set();
    const result = [];
    for (const route of routes) {
      if (route.isMiddleware) continue;
      if (route.method === "ALL") continue;
      const key = `${route.method} ${route.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!isIncludedRoute(route.method, route.path)) continue;
      const meta = ROUTE_METADATA[key];
      if (meta) {
        result.push({
          method: route.method,
          path: route.path,
          description: meta.description,
          authentication: meta.authentication,
          category: meta.category,
          documented: true
        });
      } else {
        result.push({
          method: route.method,
          path: route.path,
          description: "",
          authentication: inferAuth(route.path),
          category: inferCategory(route.path),
          documented: false
        });
      }
    }
    const methodOrder = { GET: 0, POST: 1, PUT: 2, PATCH: 3, DELETE: 4 };
    result.sort((a, b) => {
      const catCmp = a.category.localeCompare(b.category);
      if (catCmp !== 0) return catCmp;
      const methCmp = (methodOrder[a.method] ?? 5) - (methodOrder[b.method] ?? 5);
      if (methCmp !== 0) return methCmp;
      return a.path.localeCompare(b.path);
    });
    cachedRouteList = result;
    return result;
  } catch (error) {
    console.error("Failed to inspect routes:", error);
    return [];
  }
}
function buildOpenAPISpec(app, serverUrl) {
  const routes = buildRouteList(app);
  const tagSet = /* @__PURE__ */ new Set();
  for (const r of routes) {
    tagSet.add(r.category);
  }
  const tags = Array.from(tagSet).sort().map((name) => {
    const info = CATEGORY_INFO[name];
    return {
      name,
      description: info?.description || ""
    };
  });
  const paths = {};
  for (const route of routes) {
    const openApiPath = route.path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}");
    const method = route.method.toLowerCase();
    if (!paths[openApiPath]) {
      paths[openApiPath] = {};
    }
    const operation = {
      summary: route.description || `${route.method} ${route.path}`,
      tags: [route.category],
      responses: {
        "200": {
          description: "Successful response",
          content: {
            "application/json": {
              schema: { type: "object" }
            }
          }
        }
      }
    };
    if (route.authentication === true) {
      operation.security = [{ bearerAuth: [] }];
    }
    const paramMatches = route.path.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
    if (paramMatches) {
      operation.parameters = paramMatches.map((p) => ({
        name: p.slice(1),
        in: "path",
        required: true,
        schema: { type: "string" }
      }));
    }
    if (["post", "put", "patch"].includes(method)) {
      operation.requestBody = {
        content: {
          "application/json": {
            schema: { type: "object" }
          }
        }
      };
    }
    paths[openApiPath][method] = operation;
  }
  return {
    openapi: "3.0.0",
    info: {
      title: "SonicJS AI API",
      version: "2.8.0",
      description: "RESTful API for SonicJS headless CMS - a modern, AI-powered content management system built on Cloudflare Workers. Auto-discovered from registered routes.",
      contact: {
        name: "SonicJS Support",
        url: `${serverUrl}/docs`,
        email: "support@sonicjs.com"
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT"
      }
    },
    servers: [
      {
        url: serverUrl,
        description: "Current server"
      }
    ],
    tags,
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    }
  };
}

// src/services/openapi-generator.ts
var COMPONENT_SCHEMAS = {
  Content: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid", description: "Unique content identifier" },
      title: { type: "string", description: "Content title" },
      slug: { type: "string", description: "URL-friendly slug" },
      status: { type: "string", enum: ["draft", "published", "archived"], description: "Publication status" },
      collectionId: { type: "string", format: "uuid", description: "Parent collection ID" },
      data: { type: "object", description: "Collection-specific content fields" },
      created_at: { type: "integer", description: "Unix timestamp of creation" },
      updated_at: { type: "integer", description: "Unix timestamp of last update" }
    }
  },
  ContentInput: {
    type: "object",
    required: ["collectionId", "title"],
    properties: {
      collectionId: { type: "string", description: "Target collection ID" },
      title: { type: "string", description: "Content title" },
      slug: { type: "string", description: "URL-friendly slug (auto-generated if omitted)" },
      status: { type: "string", enum: ["draft", "published", "archived"], default: "draft" },
      data: { type: "object", description: "Collection-specific content fields" }
    }
  },
  Collection: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string", description: "Machine-readable collection name" },
      display_name: { type: "string", description: "Human-readable display name" },
      description: { type: "string" },
      schema: { type: "object", description: "Field definitions and validation rules" },
      is_active: { type: "integer", enum: [0, 1], description: "1 = active, 0 = inactive" }
    }
  },
  Media: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      filename: { type: "string" },
      mimetype: { type: "string" },
      size: { type: "integer", description: "File size in bytes" },
      r2_key: { type: "string", description: "R2 storage key" },
      url: { type: "string", format: "uri", description: "Public file URL via /files/ proxy" }
    }
  },
  User: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      email: { type: "string", format: "email" },
      role: { type: "string", enum: ["admin", "editor", "viewer"] },
      created_at: { type: "integer" }
    }
  },
  Error: {
    type: "object",
    properties: {
      error: { type: "string", description: "Error message" },
      details: { type: "string", description: "Additional error details" }
    }
  },
  PaginatedResponse: {
    type: "object",
    properties: {
      data: { type: "array", items: { type: "object" } },
      meta: {
        type: "object",
        properties: {
          count: { type: "integer" },
          timestamp: { type: "string", format: "date-time" },
          timing: {
            type: "object",
            properties: {
              total: { type: "integer", description: "Total response time in ms" },
              execution: { type: "integer", description: "Query execution time in ms" },
              unit: { type: "string", example: "ms" }
            }
          }
        }
      }
    }
  },
  SearchResult: {
    type: "object",
    properties: {
      data: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            slug: { type: "string" },
            excerpt: { type: "string" },
            score: { type: "number", description: "Relevance score" },
            collection: { type: "string" }
          }
        }
      },
      meta: {
        type: "object",
        properties: {
          query: { type: "string" },
          mode: { type: "string", enum: ["ai", "fts5", "keyword", "hybrid"] },
          total: { type: "integer" },
          search_id: { type: "string", description: "Search session ID for click tracking" },
          facets: { type: "object", description: "Available facet counts" }
        }
      }
    }
  },
  APIKey: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      key_prefix: { type: "string", description: "First 8 chars of the key for identification" },
      permissions: { type: "array", items: { type: "string" } },
      expires_at: { type: "string", format: "date-time", nullable: true },
      created_at: { type: "string", format: "date-time" }
    }
  }
};
var ENDPOINT_DETAILS = {
  // --- Auth ---
  "POST /auth/login": {
    operationId: "login",
    summary: "Authenticate with credentials",
    requestBody: {
      required: true,
      content: { "application/json": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string", format: "email" }, password: { type: "string", format: "password" } } } } }
    },
    responses: {
      "200": { description: "JWT token and user info", content: { "application/json": { schema: { type: "object", properties: { token: { type: "string" }, user: { "$ref": "#/components/schemas/User" } } } } } },
      "401": { description: "Invalid credentials" }
    }
  },
  "POST /auth/login/form": {
    operationId: "loginForm",
    summary: "Form-based login",
    requestBody: {
      required: true,
      content: { "application/x-www-form-urlencoded": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string", format: "email" }, password: { type: "string", format: "password" } } } } }
    },
    responses: { "302": { description: "Redirect to admin dashboard" }, "401": { description: "Invalid credentials" } }
  },
  "POST /auth/register": {
    operationId: "register",
    summary: "Register new user",
    requestBody: {
      required: true,
      content: { "application/json": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string", format: "email" }, password: { type: "string", format: "password", minLength: 8 }, name: { type: "string" } } } } }
    },
    responses: { "201": { description: "User created" }, "400": { description: "Invalid input or email exists" } }
  },
  "GET /auth/me": {
    operationId: "getCurrentUser",
    summary: "Get current user",
    responses: {
      "200": { description: "Current user", content: { "application/json": { schema: { "$ref": "#/components/schemas/User" } } } },
      "401": { description: "Not authenticated" }
    }
  },
  "POST /auth/magic-link/request": {
    operationId: "requestMagicLink",
    summary: "Request magic link email",
    requestBody: {
      required: true,
      content: { "application/json": { schema: { type: "object", required: ["email"], properties: { email: { type: "string", format: "email" } } } } }
    }
  },
  "GET /auth/magic-link/verify": {
    operationId: "verifyMagicLink",
    summary: "Verify magic link token",
    parameters: [{ name: "token", in: "query", required: true, description: "Magic link token from email", schema: { type: "string" } }]
  },
  "POST /auth/otp/request": {
    operationId: "requestOtp",
    summary: "Request one-time password",
    requestBody: {
      required: true,
      content: { "application/json": { schema: { type: "object", required: ["email"], properties: { email: { type: "string", format: "email" } } } } }
    }
  },
  "POST /auth/otp/verify": {
    operationId: "verifyOtp",
    summary: "Verify OTP code",
    requestBody: {
      required: true,
      content: { "application/json": { schema: { type: "object", required: ["email", "code"], properties: { email: { type: "string", format: "email" }, code: { type: "string" } } } } }
    }
  },
  // --- Content API ---
  "GET /api/collections": {
    operationId: "listCollections",
    summary: "List all collections",
    responses: {
      "200": { description: "Collections list", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { "$ref": "#/components/schemas/Collection" } }, meta: { type: "object" } } } } } }
    }
  },
  "GET /api/collections/:collection/content": {
    operationId: "getCollectionContent",
    summary: "Get collection content",
    parameters: [
      { name: "collection", in: "path", required: true, description: "Collection name", schema: { type: "string" } },
      { name: "limit", in: "query", description: "Max items to return (default: 50, max: 1000)", schema: { type: "integer", default: 50, maximum: 1e3 } },
      { name: "offset", in: "query", description: "Number of items to skip", schema: { type: "integer", default: 0 } },
      { name: "status", in: "query", description: "Filter by publication status", schema: { type: "string", enum: ["draft", "published", "archived"] } }
    ],
    responses: {
      "200": { description: "Content items", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { "$ref": "#/components/schemas/Content" } }, meta: { type: "object" } } } } } },
      "404": { description: "Collection not found" }
    }
  },
  "GET /api/content/:id": {
    operationId: "getContentById",
    summary: "Get content by ID",
    responses: {
      "200": { description: "Content item", content: { "application/json": { schema: { "$ref": "#/components/schemas/Content" } } } },
      "404": { description: "Content not found" }
    }
  },
  "POST /api/content": {
    operationId: "createContent",
    summary: "Create content",
    requestBody: {
      required: true,
      content: { "application/json": { schema: { "$ref": "#/components/schemas/ContentInput" } } }
    },
    responses: {
      "201": { description: "Content created", content: { "application/json": { schema: { "$ref": "#/components/schemas/Content" } } } },
      "400": { description: "Invalid request body" },
      "401": { description: "Authentication required" }
    }
  },
  "PUT /api/content/:id": {
    operationId: "updateContent",
    summary: "Update content",
    requestBody: {
      required: true,
      content: { "application/json": { schema: { "$ref": "#/components/schemas/ContentInput" } } }
    },
    responses: {
      "200": { description: "Content updated", content: { "application/json": { schema: { "$ref": "#/components/schemas/Content" } } } },
      "401": { description: "Authentication required" },
      "404": { description: "Content not found" }
    }
  },
  "DELETE /api/content/:id": {
    operationId: "deleteContent",
    summary: "Delete content",
    responses: {
      "200": { description: "Content deleted" },
      "401": { description: "Authentication required" },
      "404": { description: "Content not found" }
    }
  },
  "GET /api/content/:id/versions": {
    operationId: "getContentVersions",
    summary: "Get version history",
    responses: {
      "200": { description: "Version history", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { type: "object", properties: { id: { type: "string" }, version: { type: "integer" }, created_at: { type: "integer" }, changes: { type: "object" } } } } } } } } }
    }
  },
  "POST /api/content/:id/restore/:versionId": {
    operationId: "restoreContentVersion",
    summary: "Restore to a previous version"
  },
  // --- Media API ---
  "GET /api/media": {
    operationId: "listMedia",
    summary: "List media files",
    responses: {
      "200": { description: "Media files", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { "$ref": "#/components/schemas/Media" } }, meta: { type: "object" } } } } } }
    }
  },
  "POST /api/media/upload": {
    operationId: "uploadMedia",
    summary: "Upload a media file",
    requestBody: {
      required: true,
      description: "Multipart form upload with a file field",
      content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } } }
    },
    responses: {
      "201": { description: "File uploaded", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, file: { "$ref": "#/components/schemas/Media" } } } } } },
      "401": { description: "Authentication required" }
    }
  },
  "DELETE /api/media/:id": {
    operationId: "deleteMedia",
    summary: "Delete a media file",
    responses: { "200": { description: "Media deleted" }, "404": { description: "Media not found" } }
  },
  // --- Search ---
  "GET /api/search": {
    operationId: "search",
    summary: "Search content",
    parameters: [
      { name: "q", in: "query", required: true, description: "Search query string", schema: { type: "string" } },
      { name: "mode", in: "query", description: "Search mode", schema: { type: "string", enum: ["ai", "fts5", "keyword", "hybrid"], default: "hybrid" } },
      { name: "collection", in: "query", description: "Filter by collection name", schema: { type: "string" } },
      { name: "limit", in: "query", description: "Max results (default: 10)", schema: { type: "integer", default: 10 } },
      { name: "facets", in: "query", description: "Enable faceted search (true/false)", schema: { type: "string", enum: ["true", "false"] } },
      { name: "facet_filters", in: "query", description: "JSON-encoded facet filter object", schema: { type: "string" } }
    ],
    responses: {
      "200": { description: "Search results", content: { "application/json": { schema: { "$ref": "#/components/schemas/SearchResult" } } } }
    }
  },
  "POST /api/search/click": {
    operationId: "trackSearchClick",
    summary: "Track search result click",
    requestBody: {
      required: true,
      content: { "application/json": { schema: { type: "object", required: ["search_id", "content_id"], properties: { search_id: { type: "string" }, content_id: { type: "string" }, position: { type: "integer" } } } } }
    }
  },
  // --- API Keys ---
  "GET /admin/api-keys/api/keys": {
    operationId: "listApiKeys",
    summary: "List API keys",
    responses: {
      "200": { description: "API keys", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { "$ref": "#/components/schemas/APIKey" } } } } } } }
    }
  },
  "POST /admin/api-keys/api/keys": {
    operationId: "createApiKey",
    summary: "Create API key",
    requestBody: {
      required: true,
      content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" }, permissions: { type: "array", items: { type: "string" } }, expires_at: { type: "string", format: "date-time", nullable: true } } } } }
    },
    responses: {
      "201": { description: "API key created (includes full key \u2014 only shown once)", content: { "application/json": { schema: { type: "object", properties: { key: { type: "string", description: "Full API key (only returned at creation)" }, id: { type: "string" } } } } } }
    }
  },
  // --- Workflow ---
  "GET /workflow/status/:id": {
    operationId: "getWorkflowStatus",
    summary: "Get workflow status"
  },
  "POST /workflow/submit/:id": {
    operationId: "submitForReview",
    summary: "Submit content for review"
  },
  "POST /workflow/approve/:id": {
    operationId: "approveContent",
    summary: "Approve content"
  },
  "POST /workflow/reject/:id": {
    operationId: "rejectContent",
    summary: "Reject content"
  },
  "POST /workflow/publish/:id": {
    operationId: "publishContent",
    summary: "Publish approved content"
  },
  "POST /workflow/unpublish/:id": {
    operationId: "unpublishContent",
    summary: "Unpublish content"
  },
  "GET /workflow/history/:id": {
    operationId: "getWorkflowHistory",
    summary: "Get workflow history"
  },
  // --- Forms ---
  "POST /forms/:formId/submit": {
    operationId: "submitForm",
    summary: "Submit a form",
    requestBody: {
      required: true,
      content: { "application/json": { schema: { type: "object", description: "Form field values (varies by form definition)" } } }
    }
  },
  "GET /forms/:formId": {
    operationId: "getFormDefinition",
    summary: "Get form definition for rendering"
  },
  // --- System ---
  "GET /health": {
    operationId: "healthCheck",
    summary: "Health check"
  },
  "GET /api/health": {
    operationId: "apiHealthCheck",
    summary: "API health check",
    responses: {
      "200": { description: "API health status", content: { "application/json": { schema: { type: "object", properties: { status: { type: "string", example: "healthy" }, timestamp: { type: "string", format: "date-time" }, schemas: { type: "array", items: { type: "string" } } } } } } }
    }
  },
  "GET /api": {
    operationId: "getOpenAPISpec",
    summary: "OpenAPI specification"
  },
  // --- Files ---
  "GET /files/*": {
    operationId: "serveFile",
    summary: "Serve file from R2 storage",
    parameters: [
      { name: "path", in: "path", required: true, description: "File path (R2 object key)", schema: { type: "string" } }
    ]
  }
};
function toPascalCase(name) {
  return name.split(/[_\-\s]+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("");
}
function fieldConfigToOpenAPISchema(field) {
  const schema = {};
  switch (field.type) {
    case "string":
    case "textarea":
    case "slug":
      schema.type = "string";
      break;
    case "color":
      schema.type = "string";
      schema.pattern = "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$";
      break;
    case "file":
      schema.type = "string";
      schema.description = field.title || "File path or URL";
      break;
    case "number":
      schema.type = "number";
      break;
    case "boolean":
    case "checkbox":
      schema.type = "boolean";
      break;
    case "date":
      schema.type = "string";
      schema.format = "date";
      break;
    case "datetime":
      schema.type = "string";
      schema.format = "date-time";
      break;
    case "email":
      schema.type = "string";
      schema.format = "email";
      break;
    case "url":
      schema.type = "string";
      schema.format = "uri";
      break;
    case "select":
    case "radio":
      schema.type = "string";
      if (field.enum && field.enum.length > 0) {
        schema.enum = field.enum;
      }
      break;
    case "multiselect":
      schema.type = "array";
      schema.items = { type: "string" };
      if (field.enum && field.enum.length > 0) {
        schema.items.enum = field.enum;
      }
      break;
    case "richtext":
      schema.type = "string";
      schema.description = field.title || "Rich text HTML content";
      break;
    case "markdown":
      schema.type = "string";
      schema.description = field.title || "Markdown content";
      break;
    case "media":
      schema.type = "string";
      schema.description = field.title || "Media file reference (ID or path)";
      break;
    case "reference":
      schema.type = "string";
      schema.description = field.title || "Reference to another content item (ID)";
      break;
    case "json":
    case "object":
      schema.type = "object";
      if (field.properties) {
        schema.properties = {};
        for (const [propName, propConfig] of Object.entries(field.properties)) {
          schema.properties[propName] = fieldConfigToOpenAPISchema(propConfig);
        }
      }
      break;
    case "array":
      schema.type = "array";
      if (field.items) {
        schema.items = fieldConfigToOpenAPISchema(field.items);
      } else {
        schema.items = { type: "object" };
      }
      break;
    default:
      schema.type = "string";
  }
  if (field.title && !schema.description) {
    schema.description = field.title;
  }
  if (field.default !== void 0) {
    schema.default = field.default;
  }
  if (field.minLength !== void 0) {
    schema.minLength = field.minLength;
  }
  if (field.maxLength !== void 0) {
    schema.maxLength = field.maxLength;
  }
  if (field.min !== void 0) {
    schema.minimum = field.min;
  }
  if (field.max !== void 0) {
    schema.maximum = field.max;
  }
  if (field.pattern && !schema.pattern) {
    schema.pattern = field.pattern;
  }
  return schema;
}
function collectionSchemaToOpenAPI(collectionName, displayName, schema) {
  const pascal = toPascalCase(collectionName);
  const schemas = {};
  const dataProperties = {};
  const requiredFields = [];
  if (schema.properties) {
    for (const [fieldName, fieldConfig] of Object.entries(schema.properties)) {
      dataProperties[fieldName] = fieldConfigToOpenAPISchema(fieldConfig);
      if (schema.required?.includes(fieldName)) {
        requiredFields.push(fieldName);
      }
    }
  }
  const dataSchema = {
    type: "object",
    description: `Data fields for ${displayName || collectionName} content`,
    properties: dataProperties
  };
  if (requiredFields.length > 0) {
    dataSchema.required = requiredFields;
  }
  schemas[`${pascal}Data`] = dataSchema;
  schemas[`${pascal}Content`] = {
    type: "object",
    description: `${displayName || collectionName} content item`,
    properties: {
      id: { type: "string", format: "uuid", description: "Unique content identifier" },
      title: { type: "string", description: "Content title" },
      slug: { type: "string", description: "URL-friendly slug" },
      status: { type: "string", enum: ["draft", "published", "archived"], description: "Publication status" },
      collectionId: { type: "string", format: "uuid", description: "Parent collection ID" },
      data: { $ref: `#/components/schemas/${pascal}Data` },
      created_at: { type: "integer", description: "Unix timestamp of creation" },
      updated_at: { type: "integer", description: "Unix timestamp of last update" }
    }
  };
  schemas[`${pascal}Input`] = {
    type: "object",
    required: ["title"],
    description: `Input for creating/updating ${displayName || collectionName} content`,
    properties: {
      title: { type: "string", description: "Content title" },
      slug: { type: "string", description: "URL-friendly slug (auto-generated if omitted)" },
      status: { type: "string", enum: ["draft", "published", "archived"], default: "draft" },
      data: { $ref: `#/components/schemas/${pascal}Data` }
    }
  };
  return schemas;
}
var _collectionSchemaCache = null;
var COLLECTION_SCHEMA_CACHE_TTL = 6e4;
function clearCollectionSchemaCache() {
  _collectionSchemaCache = null;
}
async function getCollectionOpenAPIData(db) {
  if (_collectionSchemaCache && Date.now() - _collectionSchemaCache.timestamp < COLLECTION_SCHEMA_CACHE_TTL) {
    return _collectionSchemaCache.data;
  }
  try {
    const stmt = db.prepare("SELECT name, display_name, schema FROM collections WHERE is_active = 1");
    const { results } = await stmt.all();
    const allSchemas = {};
    for (const row of results) {
      if (!row.schema) continue;
      let parsedSchema;
      try {
        parsedSchema = typeof row.schema === "string" ? JSON.parse(row.schema) : row.schema;
      } catch {
        continue;
      }
      if (!parsedSchema.properties || Object.keys(parsedSchema.properties).length === 0) {
        continue;
      }
      const schemas = collectionSchemaToOpenAPI(
        row.name,
        row.display_name || row.name,
        parsedSchema
      );
      Object.assign(allSchemas, schemas);
    }
    _collectionSchemaCache = { data: allSchemas, timestamp: Date.now() };
    return allSchemas;
  } catch (error) {
    console.error("Error fetching collection schemas for OpenAPI:", error);
    return {};
  }
}
var _pluginOpenAPISchemas = {};
var _pluginEndpointDetails = {};
function registerPluginOpenAPI(pluginName, routes) {
  for (const route of routes) {
    const openapi = route.openapi;
    if (!openapi) continue;
    if (openapi.schemas) {
      Object.assign(_pluginOpenAPISchemas, openapi.schemas);
    }
    if (openapi.endpoints) {
      for (const [key, detail] of Object.entries(openapi.endpoints)) {
        _pluginEndpointDetails[key] = detail;
      }
    }
  }
}
function getPluginOpenAPISchemas() {
  return { ..._pluginOpenAPISchemas };
}
function getPluginEndpointDetail(key) {
  return _pluginEndpointDetails[key];
}
function clearPluginOpenAPIRegistry() {
  for (const key of Object.keys(_pluginOpenAPISchemas)) {
    delete _pluginOpenAPISchemas[key];
  }
  for (const key of Object.keys(_pluginEndpointDetails)) {
    delete _pluginEndpointDetails[key];
  }
}
function convertPathParams(path) {
  return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}");
}
function extractPathParams(path) {
  const matches = path.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
  return matches ? matches.map((m) => m.slice(1)) : [];
}
function generateOperationId(method, path) {
  const parts = path.replace(/^\//, "").replace(/\/\*/g, "").split("/").filter((p) => !p.startsWith(":") && !p.startsWith("{")).map((p, i) => {
    if (i === 0) return p.replace(/-/g, "");
    return p.charAt(0).toUpperCase() + p.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  });
  const prefix = method.toLowerCase();
  const suffix = parts.join("");
  return `${prefix}${suffix.charAt(0).toUpperCase()}${suffix.slice(1)}`;
}
function buildTags(routes) {
  const usedCategories = new Set(routes.map((r) => r.category));
  const tags = [];
  for (const category of usedCategories) {
    const info = CATEGORY_INFO[category];
    tags.push({
      name: category,
      description: info ? info.description : category
    });
  }
  tags.sort((a, b) => a.name.localeCompare(b.name));
  return tags;
}
function buildOperation(route) {
  const key = `${route.method} ${route.path}`;
  const detail = ENDPOINT_DETAILS[key] || getPluginEndpointDetail(key);
  const operation = {
    operationId: detail?.operationId || generateOperationId(route.method, route.path),
    summary: detail?.summary || route.description || `${route.method} ${route.path}`,
    description: route.description || void 0,
    tags: [route.category]
  };
  if (route.authentication === true) {
    operation.security = [{ bearerAuth: [] }];
  }
  const pathParamNames = extractPathParams(route.path);
  const explicitParams = detail?.parameters || [];
  const explicitParamNames = new Set(explicitParams.map((p) => p.name));
  const allParams = [];
  for (const paramName of pathParamNames) {
    if (!explicitParamNames.has(paramName)) {
      allParams.push({
        name: paramName,
        in: "path",
        required: true,
        schema: { type: "string" }
      });
    }
  }
  allParams.push(...explicitParams);
  if (allParams.length > 0) {
    operation.parameters = allParams;
  }
  if (detail?.requestBody) {
    operation.requestBody = detail.requestBody;
  }
  if (detail?.responses) {
    operation.responses = detail.responses;
  } else {
    operation.responses = buildDefaultResponses(route);
  }
  return operation;
}
function buildDefaultResponses(route) {
  const responses = {};
  switch (route.method) {
    case "GET":
      responses["200"] = {
        description: "Successful response",
        content: { "application/json": { schema: { type: "object" } } }
      };
      break;
    case "POST":
      responses["200"] = { description: "Successful response" };
      responses["201"] = { description: "Resource created" };
      break;
    case "PUT":
    case "PATCH":
      responses["200"] = { description: "Resource updated" };
      break;
    case "DELETE":
      responses["200"] = { description: "Resource deleted" };
      break;
    default:
      responses["200"] = { description: "Successful response" };
  }
  if (route.authentication === true) {
    responses["401"] = { description: "Authentication required" };
  }
  return responses;
}
async function generateOpenAPISpec(app, serverUrl, db) {
  const routes = buildRouteList(app);
  const tags = buildTags(routes);
  const paths = {};
  for (const route of routes) {
    const openApiPath = convertPathParams(route.path);
    const normalizedPath = openApiPath.replace(/\/\*$/, "/{path}");
    if (!paths[normalizedPath]) {
      paths[normalizedPath] = {};
    }
    const method = route.method.toLowerCase();
    paths[normalizedPath][method] = buildOperation(route);
  }
  const schemas = { ...COMPONENT_SCHEMAS };
  const pluginSchemas = getPluginOpenAPISchemas();
  Object.assign(schemas, pluginSchemas);
  if (db) {
    const collectionSchemas = await getCollectionOpenAPIData(db);
    Object.assign(schemas, collectionSchemas);
    if (Object.keys(collectionSchemas).length === 0) {
      schemas.Content = {
        ...schemas.Content,
        properties: {
          ...schemas.Content.properties,
          data: {
            type: "object",
            description: "Schema varies by collection. Create collections with typed fields to see collection-specific schemas (e.g., BlogPostsData, NewsData) appear here automatically."
          }
        }
      };
    }
  }
  return {
    openapi: "3.0.0",
    info: {
      title: "SonicJS AI API",
      version: "1.0.0",
      description: "RESTful API for SonicJS headless CMS \u2014 a modern, AI-powered content management system built on Cloudflare Workers. Features include content management, media handling, full-text and AI-powered search, workflow management, and more.",
      contact: {
        name: "SonicJS",
        url: "https://sonicjs.com",
        email: "support@sonicjs.com"
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT"
      }
    },
    servers: [
      {
        url: serverUrl,
        description: "Current server"
      }
    ],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT authentication token. Obtain via POST /auth/login"
        }
      },
      schemas
    },
    tags
  };
}

exports.CACHE_CONFIGS = CACHE_CONFIGS;
exports.CATEGORY_INFO = CATEGORY_INFO;
exports.CacheService = CacheService;
exports.Logger = Logger;
exports.SettingsService = SettingsService;
exports.TelemetryService = TelemetryService;
exports.apiTokens = apiTokens;
exports.buildOpenAPISpec = buildOpenAPISpec;
exports.buildRouteList = buildRouteList;
exports.clearCollectionSchemaCache = clearCollectionSchemaCache;
exports.clearPluginOpenAPIRegistry = clearPluginOpenAPIRegistry;
exports.collectionSchemaToOpenAPI = collectionSchemaToOpenAPI;
exports.collections = collections;
exports.content = content;
exports.contentVersions = contentVersions;
exports.createInstallationIdentity = createInstallationIdentity;
exports.fieldConfigToOpenAPISchema = fieldConfigToOpenAPISchema;
exports.generateOpenAPISpec = generateOpenAPISpec;
exports.getAppInstance = getAppInstance;
exports.getCacheService = getCacheService;
exports.getCollectionOpenAPIData = getCollectionOpenAPIData;
exports.getLogger = getLogger;
exports.getTelemetryService = getTelemetryService;
exports.initLogger = initLogger;
exports.initTelemetry = initTelemetry;
exports.insertCollectionSchema = insertCollectionSchema;
exports.insertContentSchema = insertContentSchema;
exports.insertLogConfigSchema = insertLogConfigSchema;
exports.insertMediaSchema = insertMediaSchema;
exports.insertPluginActivityLogSchema = insertPluginActivityLogSchema;
exports.insertPluginAssetSchema = insertPluginAssetSchema;
exports.insertPluginHookSchema = insertPluginHookSchema;
exports.insertPluginRouteSchema = insertPluginRouteSchema;
exports.insertPluginSchema = insertPluginSchema;
exports.insertSystemLogSchema = insertSystemLogSchema;
exports.insertUserSchema = insertUserSchema;
exports.insertWorkflowHistorySchema = insertWorkflowHistorySchema;
exports.logConfig = logConfig;
exports.media = media;
exports.pluginActivityLog = pluginActivityLog;
exports.pluginAssets = pluginAssets;
exports.pluginHooks = pluginHooks;
exports.pluginRoutes = pluginRoutes;
exports.plugins = plugins;
exports.registerPluginOpenAPI = registerPluginOpenAPI;
exports.schema_exports = schema_exports;
exports.selectCollectionSchema = selectCollectionSchema;
exports.selectContentSchema = selectContentSchema;
exports.selectLogConfigSchema = selectLogConfigSchema;
exports.selectMediaSchema = selectMediaSchema;
exports.selectPluginActivityLogSchema = selectPluginActivityLogSchema;
exports.selectPluginAssetSchema = selectPluginAssetSchema;
exports.selectPluginHookSchema = selectPluginHookSchema;
exports.selectPluginRouteSchema = selectPluginRouteSchema;
exports.selectPluginSchema = selectPluginSchema;
exports.selectSystemLogSchema = selectSystemLogSchema;
exports.selectUserSchema = selectUserSchema;
exports.selectWorkflowHistorySchema = selectWorkflowHistorySchema;
exports.setAppInstance = setAppInstance;
exports.systemLogs = systemLogs;
exports.toPascalCase = toPascalCase;
exports.users = users;
exports.workflowHistory = workflowHistory;
//# sourceMappingURL=chunk-4HZKL3GZ.cjs.map
//# sourceMappingURL=chunk-4HZKL3GZ.cjs.map