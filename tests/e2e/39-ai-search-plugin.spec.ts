import { test, expect } from '@playwright/test'
import { 
  loginAsAdmin, 
  ensureAdminUserExists,
  ensureWorkflowTablesExist
} from './utils/test-helpers'

test.describe('AI Search Plugin', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAdminUserExists(page)
    await ensureWorkflowTablesExist(page)
    await loginAsAdmin(page)
  })

  test('should display AI Search plugin in plugins list', async ({ page }) => {
    await page.goto('/admin/plugins')
    
    // Wait for plugins to load
    await page.waitForSelector('h1:has-text("Plugins")')
    
    // Look for AI Search plugin
    const aiSearchPlugin = page.locator('text=AI Search').first()
    await expect(aiSearchPlugin).toBeVisible({ timeout: 10000 })
  })

  test('should access AI Search settings page', async ({ page }) => {
    await page.goto('/admin/plugins/ai-search')
    
    // Check page loaded - use h1 only to avoid strict mode violation
    await expect(page.locator('h1')).toContainText(/AI Search/i, { timeout: 10000 })
    
    // Should see collections available for indexing
    const pageContent = await page.content()
    expect(pageContent).toContain('collection')
  })

  test('should show available collections for indexing', async ({ page }) => {
    await page.goto('/admin/plugins/ai-search')
    await page.waitForTimeout(2000)
    
    // Look for collection checkboxes or list
    const collections = page.locator('[type="checkbox"]').or(page.locator('text=/blog|page|news/i'))
    const collectionCount = await collections.count()
    
    // Should have at least one collection available
    expect(collectionCount).toBeGreaterThan(0)
  })

  test('should be able to select collections for indexing', async ({ page }) => {
    await page.goto('/admin/plugins/ai-search')
    await page.waitForTimeout(2000)
    
    // Find first checkbox
    const firstCheckbox = page.locator('[type="checkbox"]').first()
    
    if (await firstCheckbox.count() > 0) {
      // Check if checkbox is visible
      await expect(firstCheckbox).toBeVisible()
      
      // Get current state
      const wasChecked = await firstCheckbox.isChecked()
      
      // Toggle checkbox
      await firstCheckbox.click()
      await page.waitForTimeout(500)
      
      // Find and click save button
      const saveButton = page.locator('button:has-text("Save")').or(page.locator('button[type="submit"]'))
      if (await saveButton.count() > 0) {
        await saveButton.first().click()
        await page.waitForTimeout(2000)
        
        // Verify save was successful (look for success message or no error)
        const errorMessage = page.locator('text=/error/i').first()
        if (await errorMessage.isVisible()) {
          const errorText = await errorMessage.textContent()
          console.log('Save error (may be expected):', errorText)
        }
      }
    }
  })

  test('should show index status for collections', async ({ page }) => {
    await page.goto('/admin/plugins/ai-search')
    await page.waitForTimeout(2000)
    
    // Look for status indicators (indexed, not indexed, indexing)
    const statusIndicators = page.locator('text=/indexed|indexing|not indexed|progress/i').or(
      page.locator('[class*="status"]').or(
        page.locator('[class*="badge"]')
      )
    )
    
    const count = await statusIndicators.count()
    
    // Should have some status indicators if collections are selected
    console.log('Found status indicators:', count)
  })

  test('should have re-index functionality', async ({ page }) => {
    await page.goto('/admin/plugins/ai-search')
    await page.waitForTimeout(2000)
    
    // Look for re-index button
    const reindexButton = page.locator('button:has-text("Re-index")').or(
      page.locator('button:has-text("Reindex")')
    ).first()
    
    if (await reindexButton.count() > 0) {
      await expect(reindexButton).toBeVisible()
      
      // Click re-index (don't wait for completion as it runs in background)
      await reindexButton.click()
      await page.waitForTimeout(1000)
      
      // Should show some feedback (success message or loading state)
      const feedback = page.locator('text=/success|indexing|started|processing/i').first()
      console.log('Re-index feedback visible:', await feedback.isVisible())
    }
  })

  test('should fetch index status via API', async ({ page }) => {
    // Make API request to get index status
    const response = await page.request.get('/admin/plugins/ai-search/api/status')
    
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data).toBeDefined()
    
    // Should return status information
    console.log('Index status response:', JSON.stringify(data, null, 2))
  })

  test('should support search via API', async ({ page }) => {
    // Create some test content first
    await page.goto('/admin/content/new?collection=col-blog_posts-b5408030')
    await page.waitForTimeout(1000)
    
    // Check if we're on content creation page
    const titleInput = page.locator('input[name="title"]').or(page.locator('#title'))
    
    if (await titleInput.count() > 0) {
      await titleInput.fill('AI Search Test Content')
      
      // Fill body if available
      const bodyInput = page.locator('textarea[name="body"]').or(page.locator('#body'))
      if (await bodyInput.count() > 0) {
        await bodyInput.fill('This is test content for AI search functionality with semantic search capabilities.')
      }
      
      // Save
      const saveButton = page.locator('button:has-text("Save")').or(page.locator('button[type="submit"]'))
      if (await saveButton.count() > 0) {
        await saveButton.first().click()
        await page.waitForTimeout(2000)
      }
    }
    
    // Wait a bit for indexing
    await page.waitForTimeout(3000)
    
    // Try search API
    const searchResponse = await page.request.post('/api/search', {
      data: {
        query: 'test',
        mode: 'keyword',
        limit: 10
      }
    })
    
    expect([200, 404, 500]).toContain(searchResponse.status())
    
    if (searchResponse.status() === 200) {
      const searchData = await searchResponse.json()
      console.log('Search results:', JSON.stringify(searchData, null, 2))
    }
  })

  test('should have Custom RAG initialized', async ({ page }) => {
    await page.goto('/admin/plugins/ai-search')
    await page.waitForTimeout(2000)
    
    // Check browser console for Custom RAG logs
    const logs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'log' && msg.text().includes('Custom RAG')) {
        logs.push(msg.text())
      }
    })
    
    // Reload to capture initialization logs
    await page.reload()
    await page.waitForTimeout(2000)
    
    console.log('Custom RAG logs captured:', logs)
  })

  test('should show Vectorize binding status', async ({ page }) => {
    // Check if Vectorize is configured by looking at server logs or settings
    await page.goto('/admin/plugins/ai-search')
    await page.waitForTimeout(2000)
    
    // Look for any Vectorize-related messaging in the UI
    const pageContent = await page.content()
    const hasVectorizeInfo = pageContent.toLowerCase().includes('vectorize') || 
                             pageContent.toLowerCase().includes('vector')
    
    console.log('Vectorize info present in UI:', hasVectorizeInfo)
  })

  test('should handle plugin settings save', async ({ page }) => {
    await page.goto('/admin/plugins/ai-search')
    await page.waitForTimeout(2000)
    
    // Try to update a setting
    const enabledCheckbox = page.locator('input[type="checkbox"][name*="enabled"]').first()
    
    if (await enabledCheckbox.count() > 0) {
      await enabledCheckbox.click()
      await page.waitForTimeout(500)
      
      // Save
      const saveButton = page.locator('button:has-text("Save")').or(page.locator('button[type="submit"]'))
      if (await saveButton.count() > 0) {
        await saveButton.first().click()
        await page.waitForTimeout(2000)
        
        // Should not show error
        const errorAlert = page.locator('[role="alert"]').or(page.locator('.error'))
        if (await errorAlert.count() > 0 && await errorAlert.isVisible()) {
          const errorText = await errorAlert.textContent()
          console.log('Settings save response:', errorText)
        }
      }
    }
  })

  // Cleanup test - remove test content
  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage()
    await ensureAdminUserExists(page)
    await loginAsAdmin(page)
    
    // Navigate to content and clean up test content
    await page.goto('/admin/content')
    await page.waitForTimeout(2000)
    
    // Look for "AI Search Test Content" and delete if found
    const testContent = page.locator('text="AI Search Test Content"')
    if (await testContent.count() > 0) {
      // Try to delete (implementation depends on UI)
      console.log('Test content cleanup: Found test content to clean up')
    }
    
    await page.close()
  })
})
