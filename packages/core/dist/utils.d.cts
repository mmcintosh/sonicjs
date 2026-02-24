export { c as FilterCondition, d as FilterGroup, F as FilterOperator, f as QueryFilter, Q as QueryFilterBuilder, h as QueryResult, S as SONICJS_VERSION, T as TemplateRenderer, b as buildQuery, e as escapeHtml, g as getCoreVersion, m as metricsTracker, r as renderTemplate, s as sanitizeInput, a as sanitizeObject, t as templateRenderer } from './version-vktVAxhe.cjs';
import { b as TelemetryConfig } from './telemetry-UiD1i9GS.cjs';
import { b as BlockDefinitions } from './collection-config-BF95LgQb.cjs';
import { z } from 'zod';

/**
 * Slug generation utilities for creating URL-friendly slugs
 */
/**
 * Generate URL-friendly slug from text
 *
 * Features:
 * - Converts to lowercase
 * - Handles accented characters (NFD normalization)
 * - Removes diacritics
 * - Keeps only alphanumeric, spaces, underscores, and hyphens
 * - Replaces spaces with hyphens
 * - Collapses multiple hyphens/underscores
 * - Trims leading/trailing hyphens/underscores
 * - Limits length to 100 characters
 *
 * @param text - Text to slugify
 * @returns URL-safe slug
 *
 * @example
 * generateSlug('Hello World!') // 'hello-world'
 * generateSlug('Café París 2024') // 'cafe-paris-2024'
 * generateSlug('Multiple   Spaces') // 'multiple-spaces'
 */
declare function generateSlug(text: string): string;

/**
 * Telemetry ID Utilities
 *
 * Generates and manages anonymous installation IDs
 */
/**
 * Generate a new anonymous installation ID
 * Uses globalThis.crypto for Cloudflare Workers compatibility
 */
declare function generateInstallationId(): string;
/**
 * Generate a project-specific ID from project name
 * Uses a simple hash to anonymize while maintaining consistency
 */
declare function generateProjectId(projectName: string): string;
/**
 * Sanitize error messages to remove any potential PII
 */
declare function sanitizeErrorMessage(error: Error | string): string;
/**
 * Sanitize route to remove any user-specific data
 */
declare function sanitizeRoute(route: string): string;

/**
 * Telemetry Configuration Utilities
 *
 * Manages telemetry settings and opt-out mechanisms
 */

/**
 * Get default telemetry configuration
 * Uses lazy evaluation to avoid accessing process.env at module load time
 */
declare function getDefaultTelemetryConfig(): TelemetryConfig;
/**
 * Check if telemetry is enabled via environment variables
 */
declare function isTelemetryEnabled(): boolean;
/**
 * Get telemetry configuration from environment
 */
declare function getTelemetryConfig(): TelemetryConfig;
/**
 * Check if telemetry should be skipped for this event
 * Used to implement sampling or rate limiting if needed
 */
declare function shouldSkipEvent(eventName: string, sampleRate?: number): boolean;

type BlocksFieldConfig = {
    blocks: BlockDefinitions;
    discriminator: string;
};
declare function getBlocksFieldConfig(fieldOptions: any): BlocksFieldConfig | null;
declare function parseBlocksValue(value: unknown, config: BlocksFieldConfig): {
    value: any[];
    errors: string[];
};

declare const MAX_FILE_SIZE: number;
declare const ALLOWED_MIME_TYPES: readonly ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "video/mp4", "video/webm", "video/ogg", "video/avi", "video/quicktime", "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4"];
type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];
declare const MIME_TO_EXTENSIONS: Record<string, string[]>;
declare function normalizeMimeType(type: string): string;
interface MagicByteResult {
    valid: boolean;
    detectedType?: string;
    error?: string;
}
declare function validateMagicBytes(buffer: ArrayBuffer, claimedType: string): MagicByteResult;
declare function validateFileExtension(filename: string, mimeType: string): boolean;
declare function validateFolder(folder: string | undefined | null): boolean;
declare const fileValidationSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodString;
    size: z.ZodNumber;
}, z.core.$strip>;
declare function getContentDisposition(mimeType: string): 'attachment' | 'inline';
interface FileValidationResult {
    valid: boolean;
    errors: string[];
    normalizedMimeType: string;
}
declare function validateUploadedFile(file: {
    name: string;
    type: string;
    size: number;
}, buffer: ArrayBuffer, folder?: string | null): FileValidationResult;

export { ALLOWED_MIME_TYPES, type AllowedMimeType, type FileValidationResult, MAX_FILE_SIZE, MIME_TO_EXTENSIONS, type MagicByteResult, fileValidationSchema, generateInstallationId, generateProjectId, generateSlug, getBlocksFieldConfig, getContentDisposition, getDefaultTelemetryConfig, getTelemetryConfig, isTelemetryEnabled, normalizeMimeType, parseBlocksValue, sanitizeErrorMessage, sanitizeRoute, shouldSkipEvent, validateFileExtension, validateFolder, validateMagicBytes, validateUploadedFile };
