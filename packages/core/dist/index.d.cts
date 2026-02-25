export { B as Bindings, b as SonicJSApp, S as SonicJSConfig, V as Variables, c as createSonicJSApp, s as setupCoreMiddleware, a as setupCoreRoutes } from './app-BO5F5JJy.cjs';
import { s as schema, P as PluginBuilderOptions, a as Plugin, b as PluginRoutes, c as PluginRouteOpenAPI, d as PluginMiddleware, e as PluginModel, f as PluginService, g as PluginAdminPage, h as PluginMenuItem, i as PluginComponent, j as PluginHook } from './types-BV17pujv.cjs';
export { am as Collection, ao as Content, G as CorePlugin, au as DbPlugin, aw as DbPluginHook, D as LogCategory, aG as LogConfig, E as LogEntry, F as LogFilter, C as LogLevel, L as Logger, aq as Media, A as Migration, M as MigrationService, B as MigrationStatus, an as NewCollection, ap as NewContent, aH as NewLogConfig, ar as NewMedia, av as NewPlugin, aD as NewPluginActivityLog, aB as NewPluginAsset, ax as NewPluginHook, az as NewPluginRoute, aF as NewSystemLog, al as NewUser, at as NewWorkflowHistory, aC as PluginActivityLog, aA as PluginAsset, z as PluginBootstrapService, ay as PluginRoute, y as PluginServiceClass, aE as SystemLog, ak as User, as as WorkflowHistory, O as apiTokens, t as cleanupRemovedCollections, I as collections, J as content, K as contentVersions, u as fullCollectionSync, m as getAvailableCollectionNames, w as getLogger, q as getManagedCollections, x as initLogger, _ as insertCollectionSchema, a0 as insertContentSchema, ai as insertLogConfigSchema, a2 as insertMediaSchema, ae as insertPluginActivityLogSchema, ac as insertPluginAssetSchema, a8 as insertPluginHookSchema, aa as insertPluginRouteSchema, a6 as insertPluginSchema, ag as insertSystemLogSchema, Y as insertUserSchema, a4 as insertWorkflowHistorySchema, p as isCollectionManaged, k as loadCollectionConfig, l as loadCollectionConfigs, X as logConfig, N as media, V as pluginActivityLog, U as pluginAssets, S as pluginHooks, T as pluginRoutes, R as plugins, r as registerCollections, $ as selectCollectionSchema, a1 as selectContentSchema, aj as selectLogConfigSchema, a3 as selectMediaSchema, af as selectPluginActivityLogSchema, ad as selectPluginAssetSchema, a9 as selectPluginHookSchema, ab as selectPluginRouteSchema, a7 as selectPluginSchema, ah as selectSystemLogSchema, Z as selectUserSchema, a5 as selectWorkflowHistorySchema, o as syncCollection, n as syncCollections, W as systemLogs, H as users, v as validateCollectionConfig, Q as workflowHistory } from './types-BV17pujv.cjs';
export { c as CollectionConfig, d as CollectionConfigModule, C as CollectionSchema, e as CollectionSyncResult, a as FieldConfig, F as FieldType } from './collection-config-BF95LgQb.cjs';
export { AuthManager, Permission, PermissionManager, UserPermissions, bootstrapMiddleware, cacheHeaders, compressionMiddleware, detailedLoggingMiddleware, getActivePlugins, isPluginActive, logActivity, loggingMiddleware, optionalAuth, performanceLoggingMiddleware, requireActivePlugin, requireActivePlugins, requireAnyPermission, requireAuth, requirePermission, requireRole, securityHeaders, securityLoggingMiddleware } from './middleware.cjs';
export { H as HookSystemImpl, a as HookUtils, b as PluginManagerClass, P as PluginRegistryImpl, c as PluginValidatorClass, S as ScopedHookSystemClass } from './plugin-manager-vBal9Zip.cjs';
export { ROUTES_INFO, adminApiRoutes, adminCheckboxRoutes, adminCodeExamplesRoutes, adminCollectionsRoutes, adminContentRoutes, adminDashboardRoutes, adminDesignRoutes, adminLogsRoutes, adminMediaRoutes, adminPluginRoutes, adminSettingsRoutes, adminTestimonialsRoutes, adminUsersRoutes, apiContentCrudRoutes, apiMediaRoutes, apiRoutes, apiSystemRoutes, authRoutes } from './routes.cjs';
export { A as AlertData, C as ConfirmationDialogOptions, k as Filter, j as FilterBarData, l as FilterOption, h as FormData, F as FormField, P as PaginationData, T as TableColumn, i as TableData, g as getConfirmationDialogScript, d as renderAlert, e as renderConfirmationDialog, f as renderFilterBar, r as renderForm, a as renderFormField, c as renderPagination, b as renderTable } from './filter-bar.template-Daw8ZDoq.cjs';
export { A as AuthService, C as ContentService, v as HOOKS, k as HookContext, H as HookHandler, u as HookName, l as HookSystem, p as MediaService, P as Plugin, g as PluginAdminPage, r as PluginBuilderOptions, h as PluginComponent, b as PluginConfig, a as PluginContext, j as PluginHook, q as PluginLogger, n as PluginManager, i as PluginMenuItem, d as PluginMiddleware, e as PluginModel, m as PluginRegistry, c as PluginRoutes, f as PluginService, o as PluginStatus, t as PluginValidationResult, s as PluginValidator, S as ScopedHookSystem } from './plugin-zvZpaiP5.cjs';
export { P as PluginManifest } from './plugin-manifest-Dpy8wxIB.cjs';
export { c as FilterCondition, d as FilterGroup, F as FilterOperator, f as QueryFilter, Q as QueryFilterBuilder, h as QueryResult, S as SONICJS_VERSION, T as TemplateRenderer, b as buildQuery, e as escapeHtml, g as getCoreVersion, m as metricsTracker, r as renderTemplate, s as sanitizeInput, a as sanitizeObject, t as templateRenderer } from './version-vktVAxhe.cjs';
import * as drizzle_orm_d1 from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { z } from 'zod';
import '@cloudflare/workers-types';
import 'drizzle-zod';
import 'drizzle-orm/sqlite-core';
import 'hono/types';

declare function createDb(d1: D1Database): drizzle_orm_d1.DrizzleD1Database<typeof schema> & {
    $client: D1Database;
};

/**
 * Plugin Builder SDK
 *
 * Provides a fluent API for building SonicJS plugins
 *
 * @packageDocumentation
 */

/**
 * Fluent builder for creating SonicJS plugins.
 *
 * @beta This API is in beta and may change in future releases.
 *
 * @example
 * ```typescript
 * import { PluginBuilder } from '@sonicjs-cms/core'
 *
 * const plugin = PluginBuilder.create({
 *   name: 'my-plugin',
 *   version: '1.0.0',
 *   description: 'My custom plugin'
 * })
 *   .addRoute('/api/my-plugin', routes)
 *   .addHook('content:save', handler)
 *   .lifecycle({ activate: async () => console.log('Activated!') })
 *   .build()
 * ```
 */
declare class PluginBuilder {
    private plugin;
    constructor(options: PluginBuilderOptions);
    /**
     * Create a new plugin builder
     */
    static create(options: PluginBuilderOptions): PluginBuilder;
    /**
     * Add metadata to the plugin
     */
    metadata(metadata: {
        description?: string;
        author?: Plugin['author'];
        license?: string;
        compatibility?: string;
        dependencies?: string[];
    }): PluginBuilder;
    /**
     * Add routes to plugin
     */
    addRoutes(routes: PluginRoutes[]): PluginBuilder;
    /**
     * Add a single route to plugin
     */
    addRoute(path: string, handler: Hono, options?: {
        description?: string;
        requiresAuth?: boolean;
        roles?: string[];
        priority?: number;
        openapi?: PluginRouteOpenAPI;
    }): PluginBuilder;
    /**
     * Add middleware to plugin
     */
    addMiddleware(middleware: PluginMiddleware[]): PluginBuilder;
    /**
     * Add a single middleware to plugin
     */
    addSingleMiddleware(name: string, handler: any, options?: {
        description?: string;
        priority?: number;
        routes?: string[];
        global?: boolean;
    }): PluginBuilder;
    /**
     * Add models to plugin
     */
    addModels(models: PluginModel[]): PluginBuilder;
    /**
     * Add a single model to plugin
     */
    addModel(name: string, options: {
        tableName: string;
        schema: z.ZodSchema;
        migrations: string[];
        relationships?: PluginModel['relationships'];
        extendsContent?: boolean;
    }): PluginBuilder;
    /**
     * Add services to plugin
     */
    addServices(services: PluginService[]): PluginBuilder;
    /**
     * Add a single service to plugin
     */
    addService(name: string, implementation: any, options?: {
        description?: string;
        dependencies?: string[];
        singleton?: boolean;
    }): PluginBuilder;
    /**
     * Add admin pages to plugin
     */
    addAdminPages(pages: PluginAdminPage[]): PluginBuilder;
    /**
     * Add a single admin page to plugin
     */
    addAdminPage(path: string, title: string, component: string, options?: {
        description?: string;
        permissions?: string[];
        icon?: string;
        menuItem?: PluginMenuItem;
    }): PluginBuilder;
    /**
     * Add admin components to plugin
     */
    addComponents(components: PluginComponent[]): PluginBuilder;
    /**
     * Add a single admin component to plugin
     */
    addComponent(name: string, template: (props: any) => string, options?: {
        description?: string;
        propsSchema?: z.ZodSchema;
    }): PluginBuilder;
    /**
     * Add menu items to plugin
     */
    addMenuItems(items: PluginMenuItem[]): PluginBuilder;
    /**
     * Add a single menu item to plugin
     */
    addMenuItem(label: string, path: string, options?: {
        icon?: string;
        order?: number;
        parent?: string;
        permissions?: string[];
    }): PluginBuilder;
    /**
     * Add hooks to plugin
     */
    addHooks(hooks: PluginHook[]): PluginBuilder;
    /**
     * Add a single hook to plugin
     */
    addHook(name: string, handler: any, options?: {
        priority?: number;
        description?: string;
    }): PluginBuilder;
    /**
     * Add lifecycle hooks
     */
    lifecycle(hooks: {
        install?: Plugin['install'];
        uninstall?: Plugin['uninstall'];
        activate?: Plugin['activate'];
        deactivate?: Plugin['deactivate'];
        configure?: Plugin['configure'];
    }): PluginBuilder;
    /**
     * Build the plugin
     */
    build(): Plugin;
}
/**
 * Helper functions for common plugin patterns.
 *
 * @beta This API is in beta and may change in future releases.
 */
declare class PluginHelpers {
    /**
     * Create a REST API route for a model.
     *
     * @experimental This method returns placeholder routes. Full implementation coming soon.
     */
    static createModelAPI(modelName: string, options?: {
        basePath?: string;
        permissions?: {
            read?: string[];
            write?: string[];
            delete?: string[];
        };
    }): Hono;
    /**
     * Create an admin CRUD interface for a model.
     *
     * @experimental This method generates basic admin page structures. Full implementation coming soon.
     */
    static createAdminInterface(modelName: string, options?: {
        icon?: string;
        permissions?: string[];
        fields?: Array<{
            name: string;
            type: string;
            label: string;
            required?: boolean;
        }>;
    }): {
        pages: PluginAdminPage[];
        menuItems: PluginMenuItem[];
    };
    /**
     * Create a database migration for a model
     */
    static createMigration(tableName: string, fields: Array<{
        name: string;
        type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB';
        nullable?: boolean;
        primaryKey?: boolean;
        unique?: boolean;
        defaultValue?: string;
    }>): string;
    /**
     * Create a Zod schema for a model
     */
    static createSchema(fields: Array<{
        name: string;
        type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
        optional?: boolean;
        required?: boolean;
        validation?: any;
        items?: any;
        properties?: Record<string, any>;
    }>): z.ZodSchema;
}

/**
 * AI Search Plugin Types
 */
interface AISearchSettings {
    id?: number;
    enabled: boolean;
    ai_mode_enabled: boolean;
    selected_collections: string[];
    dismissed_collections: string[];
    autocomplete_enabled: boolean;
    cache_duration: number;
    results_limit: number;
    index_media: boolean;
    index_status?: Record<string, IndexStatus>;
    last_indexed_at?: number;
    created_at?: number;
    updated_at?: number;
    query_rewriting_enabled?: boolean;
    reranking_enabled?: boolean;
    fts5_title_boost?: number;
    fts5_slug_boost?: number;
    fts5_body_boost?: number;
    query_synonyms_enabled?: boolean;
    facets_enabled?: boolean;
    facet_config?: FacetDefinition[];
    facet_max_values?: number;
    related_searches_enabled?: boolean;
}
interface IndexStatus {
    collection_id: string;
    collection_name: string;
    total_items: number;
    indexed_items: number;
    last_sync_at?: number;
    status: 'pending' | 'indexing' | 'completed' | 'error';
    error_message?: string;
}
/** Persisted facet configuration — stored in AISearchSettings.facet_config */
interface FacetDefinition {
    name: string;
    field: string;
    type: 'builtin' | 'json_scalar' | 'json_array';
    collections?: string[];
    maxValues?: number;
    sortBy?: 'count' | 'alpha';
    enabled: boolean;
    source: 'auto' | 'manual' | 'agent';
    position: number;
}
type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'archived';
type ExperimentMode = 'ab' | 'interleave' | 'bandit';
interface Experiment {
    id: string;
    name: string;
    description: string | null;
    status: ExperimentStatus;
    mode: ExperimentMode;
    traffic_pct: number;
    split_ratio: number;
    variants: {
        control: Partial<AISearchSettings>;
        treatment: Partial<AISearchSettings>;
    };
    metrics: ExperimentMetrics | null;
    winner: string | null;
    confidence: number | null;
    min_searches: number;
    started_at: number | null;
    ended_at: number | null;
    created_at: number;
    updated_at: number;
}
interface ExperimentMetrics {
    control: VariantMetrics;
    treatment: VariantMetrics;
    confidence: number;
    significant: boolean;
}
interface VariantMetrics {
    searches: number;
    clicks: number;
    ctr: number;
    zero_result_rate: number;
    avg_click_position: number;
    avg_response_time_ms: number;
}

/**
 * Analytics Engine dataset binding type (minimal — Cloudflare Workers types).
 * writeDataPoint() is fire-and-forget (non-blocking, returns void).
 */
interface AnalyticsEngineDataset {
    writeDataPoint(data: {
        indexes?: string[];
        blobs?: (string | null)[];
        doubles?: number[];
    }): void;
}
declare class ExperimentService {
    private db;
    private kv?;
    private analytics?;
    constructor(db: D1Database, kv?: KVNamespace | undefined, analytics?: AnalyticsEngineDataset | undefined);
    getAll(options?: {
        status?: ExperimentStatus;
        mode?: ExperimentMode;
        limit?: number;
        offset?: number;
    }): Promise<Experiment[]>;
    getById(id: string): Promise<Experiment | null>;
    create(data: {
        name: string;
        description?: string;
        mode?: ExperimentMode;
        traffic_pct?: number;
        split_ratio?: number;
        variants: {
            control: Partial<AISearchSettings>;
            treatment: Partial<AISearchSettings>;
        };
        min_searches?: number;
    }): Promise<Experiment>;
    update(id: string, data: {
        name?: string;
        description?: string;
        mode?: ExperimentMode;
        traffic_pct?: number;
        split_ratio?: number;
        variants?: {
            control: Partial<AISearchSettings>;
            treatment: Partial<AISearchSettings>;
        };
        min_searches?: number;
    }): Promise<Experiment | null>;
    delete(id: string): Promise<boolean>;
    start(id: string): Promise<Experiment>;
    pause(id: string): Promise<Experiment>;
    complete(id: string, winner?: string): Promise<Experiment>;
    archive(id: string): Promise<Experiment>;
    getActiveExperiment(): Promise<Experiment | null>;
    /**
     * Deterministic variant assignment via FNV-1a hash.
     * Same user + experiment always gets the same variant.
     */
    assignVariant(experimentId: string, userId: string, splitRatio?: number): 'control' | 'treatment';
    /**
     * Check if a user should be enrolled in the experiment based on traffic_pct.
     */
    shouldEnroll(experimentId: string, userId: string, trafficPct: number): boolean;
    trackSearchEvent(data: {
        experimentId: string;
        variantId: string;
        query: string;
        searchMode: string;
        userId: string;
        searchId: string;
        resultsCount: number;
        responseTimeMs: number;
    }): void;
    trackClickEvent(data: {
        experimentId: string;
        variantId: string;
        searchId: string;
        contentId: string;
        clickPosition: number;
    }): void;
    evaluateExperiment(id: string): Promise<ExperimentMetrics | null>;
    private evaluateFromD1;
    private evaluateFromAnalyticsEngine;
    private buildMetrics;
}

/**
 * @sonicjs/core - Main Entry Point
 *
 * Core framework for SonicJS headless CMS
 * Built for Cloudflare's edge platform with TypeScript
 *
 * Phase 2 Migration Status:
 * - Week 1: Types, Utils, Database (COMPLETED ✓)
 * - Week 2: Services, Middleware, Plugins (COMPLETED ✓)
 * - Week 3: Routes, Templates (COMPLETED ✓)
 * - Week 4: Integration & Testing (COMPLETED ✓)
 *
 * Test Coverage:
 * - Utilities: 48 tests (sanitize, query-filter, metrics)
 * - Middleware: 51 tests (auth, logging, security, performance)
 * - Total: 99 tests passing
 */

declare const VERSION: string;

export { ExperimentService, PluginBuilder, PluginHelpers, VERSION, createDb };
