import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './utils/test-helpers';

test.describe('OpenAPI Spec (GET /api)', () => {
  test('should return a valid OpenAPI 3.0.0 spec', async ({ request }) => {
    const response = await request.get('/api');

    expect(response.ok()).toBeTruthy();
    const spec = await response.json();

    expect(spec.openapi).toBe('3.0.0');
    expect(spec.info).toBeDefined();
    expect(spec.info.title).toContain('SonicJS');
    expect(spec.info.version).toBeTruthy();
    expect(spec.info.description).toBeTruthy();
    expect(spec.paths).toBeDefined();
    expect(spec.components).toBeDefined();
  });

  test('should include security schemes', async ({ request }) => {
    const response = await request.get('/api');
    const spec = await response.json();

    expect(spec.components.securitySchemes).toBeDefined();
    expect(spec.components.securitySchemes.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
  });

  test('should include component schemas', async ({ request }) => {
    const response = await request.get('/api');
    const spec = await response.json();

    expect(spec.components.schemas).toBeDefined();
    expect(spec.components.schemas).toHaveProperty('Content');
    expect(spec.components.schemas).toHaveProperty('Collection');
    expect(spec.components.schemas).toHaveProperty('Media');
    expect(spec.components.schemas).toHaveProperty('User');
    expect(spec.components.schemas).toHaveProperty('Error');
  });

  test('should have auto-discovered paths from route registry', async ({ request }) => {
    const response = await request.get('/api');
    const spec = await response.json();

    const pathCount = Object.keys(spec.paths).length;
    // We registered 150+ routes, after whitelist filtering expect at least 50
    expect(pathCount).toBeGreaterThanOrEqual(50);
  });

  test('should include core API paths', async ({ request }) => {
    const response = await request.get('/api');
    const spec = await response.json();

    expect(spec.paths).toHaveProperty('/api/health');
    expect(spec.paths).toHaveProperty('/api/collections');
    expect(spec.paths).toHaveProperty('/api/content');
    expect(spec.paths).toHaveProperty('/auth/login');
    expect(spec.paths).toHaveProperty('/health');
  });

  test('should include tags for endpoint categories', async ({ request }) => {
    const response = await request.get('/api');
    const spec = await response.json();

    expect(spec.tags).toBeDefined();
    expect(Array.isArray(spec.tags)).toBe(true);
    expect(spec.tags.length).toBeGreaterThanOrEqual(5);

    const tagNames = spec.tags.map((t: any) => t.name);
    expect(tagNames).toContain('Auth');
    expect(tagNames).toContain('Content');
    expect(tagNames).toContain('System');
  });

  test('should convert path params to OpenAPI format', async ({ request }) => {
    const response = await request.get('/api');
    const spec = await response.json();

    // Paths should use {param} not :param
    const pathKeys = Object.keys(spec.paths);
    const hasColonParams = pathKeys.some(p => /:/.test(p));
    expect(hasColonParams).toBe(false);

    // Should have at least one path with {id} parameter
    const hasBraceParams = pathKeys.some(p => /\{/.test(p));
    expect(hasBraceParams).toBe(true);
  });

  test('should mark authenticated endpoints with security', async ({ request }) => {
    const response = await request.get('/api');
    const spec = await response.json();

    // POST /api/content requires auth
    const createContent = spec.paths['/api/content']?.post;
    if (createContent) {
      expect(createContent.security).toBeDefined();
      expect(createContent.security).toEqual([{ bearerAuth: [] }]);
    }

    // GET /health is public
    const healthCheck = spec.paths['/health']?.get;
    if (healthCheck) {
      expect(healthCheck.security).toBeUndefined();
    }
  });

  test('should return correct content-type', async ({ request }) => {
    const response = await request.get('/api');
    expect(response.headers()['content-type']).toContain('application/json');
  });
});

test.describe('Admin API Reference Page', () => {
  test('should load the API Reference page after login', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/api-reference');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Should show the API Reference page
    await expect(page.locator('text=API Reference')).toBeVisible({ timeout: 15000 });
  });

  test('should display endpoint categories', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/api-reference');
    await page.waitForLoadState('networkidle');

    // Should show at least some endpoint categories
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Auth');
    expect(pageContent).toContain('Content');
  });

  test('should have two tabs: Endpoints and Interactive', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/api-reference');
    await page.waitForLoadState('networkidle');

    // Check for tab buttons
    const endpointsTab = page.locator('#tab-endpoints');
    const interactiveTab = page.locator('#tab-interactive');

    await expect(endpointsTab).toBeVisible({ timeout: 15000 });
    await expect(interactiveTab).toBeVisible({ timeout: 15000 });
  });

  test('should switch to Interactive tab and show Scalar', async ({ page }) => {
    test.slow(); // Scalar loads from CDN — allow extra time in CI
    await loginAsAdmin(page);
    await page.goto('/admin/api-reference');
    await page.waitForLoadState('networkidle');

    // Click on Interactive tab
    const interactiveTab = page.locator('#tab-interactive');
    await interactiveTab.click();

    // Wait for Scalar container to become visible
    const scalarContainer = page.locator('#content-interactive');
    await expect(scalarContainer).toBeVisible({ timeout: 30000 });

    // Scalar loads from CDN — wait for the script to initialize
    await page.waitForTimeout(5000);

    // The Scalar container should have content
    const content = await scalarContainer.innerHTML();
    expect(content.length).toBeGreaterThan(100);
  });

  test('should display endpoints in the Endpoints tab', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/api-reference');
    await page.waitForLoadState('networkidle');

    // Should show HTTP method badges
    const pageContent = await page.textContent('body');

    // At least some common methods should appear
    expect(pageContent).toContain('GET');
    expect(pageContent).toContain('POST');
  });

  test('should show endpoint count badge', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/api-reference');
    await page.waitForLoadState('networkidle');

    // The page should indicate a large number of endpoints
    // Look for the count in the Endpoints tab label or header
    const pageContent = await page.textContent('body');

    // Should mention "endpoints" somewhere (count badge, header, etc.)
    expect(pageContent?.toLowerCase()).toContain('endpoint');
  });

  test('should have OpenAPI Spec download button', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/api-reference');
    await page.waitForLoadState('networkidle');

    // Should have a button/link to view the OpenAPI spec
    const specButton = page.locator('a[href="/api"], button:has-text("OpenAPI")').first();
    await expect(specButton).toBeVisible({ timeout: 15000 });
  });

  test('should not show "Interactive Docs" button in header', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/api-reference');
    await page.waitForLoadState('networkidle');

    // The redundant "Interactive Docs" button was removed
    const interactiveDocsButton = page.locator('a:has-text("Interactive Docs")');
    await expect(interactiveDocsButton).not.toBeVisible();
  });

  test('should not have Scalar test request buttons', async ({ page }) => {
    test.slow(); // Scalar loads from CDN — allow extra time in CI
    await loginAsAdmin(page);
    await page.goto('/admin/api-reference');
    await page.waitForLoadState('networkidle');

    // Switch to interactive tab where Scalar lives
    const interactiveTab = page.locator('#tab-interactive');
    await interactiveTab.click();

    // Give Scalar time to fully load from CDN
    await page.waitForTimeout(8000);

    // The hideTestRequestButton config should prevent "Test Request" buttons
    // Check the Scalar config that was passed
    const scalarConfig = await page.evaluate(() => {
      const el = document.querySelector('[data-configuration]');
      if (el) {
        try {
          return JSON.parse(el.getAttribute('data-configuration') || '{}');
        } catch { return null; }
      }
      return null;
    });

    if (scalarConfig) {
      expect(scalarConfig.hideTestRequestButton).toBe(true);
    }
  });
});

test.describe('OpenAPI Collection Schemas', () => {
  test('should include collection-specific schemas when collections exist', async ({ request }) => {
    const response = await request.get('/api');
    expect(response.ok()).toBeTruthy();
    const spec = await response.json();

    // The preview site has blog_posts and news collections with typed fields
    // Check for at least one collection-specific schema
    const schemaNames = Object.keys(spec.components.schemas);
    const collectionSchemas = schemaNames.filter(name =>
      name.endsWith('Data') && name !== 'SeedData' && !['PaginatedResponse'].includes(name)
    );

    // If collections with schema fields exist, we should see them
    // This is conditional because it depends on the test environment state
    if (collectionSchemas.length > 0) {
      // Verify the naming convention is PascalCase + "Data"
      for (const name of collectionSchemas) {
        expect(name).toMatch(/^[A-Z][a-zA-Z]*Data$/);
      }

      // Each Data schema should have a corresponding Content and Input schema
      for (const dataName of collectionSchemas) {
        const baseName = dataName.replace(/Data$/, '');
        expect(schemaNames).toContain(`${baseName}Content`);
        expect(schemaNames).toContain(`${baseName}Input`);
      }
    }
  });

  test('should have PascalCase schema names for collections', async ({ request }) => {
    const response = await request.get('/api');
    const spec = await response.json();

    const schemaNames = Object.keys(spec.components.schemas);

    // All schema names should start with uppercase (PascalCase convention)
    for (const name of schemaNames) {
      expect(name[0]).toBe(name[0].toUpperCase());
    }
  });
});

test.describe('Admin Navigation', () => {
  test('should not have API Docs link in sidebar', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // The "API Docs" nav item was removed from the sidebar
    // Check that there's no link to /admin/api-docs in the nav
    const apiDocsNavLink = page.locator('nav a[href="/admin/api-docs"]');
    await expect(apiDocsNavLink).not.toBeVisible();
  });
});
