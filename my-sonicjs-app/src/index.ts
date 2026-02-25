/**
 * My SonicJS Application
 *
 * Entry point for your SonicJS headless CMS application
 */

import { Hono } from 'hono'
import { createSonicJSApp, registerCollections, ExperimentService, getLogger } from '@sonicjs-cms/core'
import type { SonicJSConfig } from '@sonicjs-cms/core'

// Import custom collections
import blogPostsCollection from './collections/blog-posts.collection'
import pageBlocksCollection from './collections/page-blocks.collection'
import contactMessagesCollection from './collections/contact-messages.collection'
import venuesCollection from './collections/venues.collection'
import bookingsCollection from './collections/bookings.collection'

// Import plugins (manual mounting until auto-loading is implemented)
import contactFormPlugin from './plugins/contact-form/index'

// Import Family Fun in Bmore demo site routes
import bmoreRoutes from './bmore/routes'

// Register all custom collections
registerCollections([
  blogPostsCollection,
  pageBlocksCollection,
  contactMessagesCollection,
  venuesCollection,
  bookingsCollection,
])

// Application configuration
const config: SonicJSConfig = {
  collections: {
    autoSync: true
  },
  plugins: {
    directory: './src/plugins',
    autoLoad: false,  // Set to true to auto-load custom plugins
    disableAll: false,  // Enable plugins
    enabled: ['email', 'contact-form']  // Enable specific plugins
  }
}

// Create the core application
const coreApp = createSonicJSApp(config)

// Create main app and mount plugin routes manually
// (Plugin auto-mounting not yet implemented in core)
const app = new Hono()

// Mount plugin routes
if (contactFormPlugin.routes) {
  for (const route of contactFormPlugin.routes) {
    app.route(route.path, route.handler)
  }
}

// Mount Family Fun in Bmore demo site
app.route('/bmore', bmoreRoutes)

// Mount core app last (catch-all)
app.route('/', coreApp)

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext) {
    // Evaluate active A/B test experiments
    const expService = new ExperimentService(env.DB, env.CACHE_KV, env.SEARCH_EXPERIMENTS)
    const active = await expService.getActiveExperiment()
    if (active) {
      const result = await expService.evaluateExperiment(active.id)
      if (result?.auto_completed) {
        console.log('[Cron] Experiment ' + active.id + ' auto-completed: winner=' + result.winner)
      }
    }

    // Clean up old logs (respects retention settings in log_config)
    try {
      const logger = getLogger(env.DB)
      await logger.cleanupByRetention()

      // Clean up activity logs older than 90 days
      const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000)
      await env.DB.prepare('DELETE FROM activity_logs WHERE created_at < ?').bind(cutoff).run()
    } catch (e) {
      console.error('[Cron] Log cleanup failed:', e)
    }
  }
}
