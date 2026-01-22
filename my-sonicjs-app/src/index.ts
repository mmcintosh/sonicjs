/**
 * My SonicJS Application
 *
 * Entry point for your SonicJS headless CMS application
 */

import { Hono } from 'hono'
import { createSonicJSApp, registerCollections } from '@sonicjs-cms/core'
import type { SonicJSConfig } from '@sonicjs-cms/core'

// Import custom collections
import blogPostsCollection from './collections/blog-posts.collection'
import pageBlocksCollection from './collections/page-blocks.collection'
import contactMessagesCollection from './collections/contact-messages.collection'

// Import plugins (manual mounting until auto-loading is implemented)
import contactFormPlugin from './plugins/contact-form/index'

// Register all custom collections
registerCollections([
  blogPostsCollection,
  pageBlocksCollection,
  contactMessagesCollection
])

// Application configuration
const config: SonicJSConfig = {
  collections: {
    autoSync: true
  },
  plugins: {
    directory: './src/plugins',
    autoLoad: false,  // Set to true to auto-load custom plugins
    disableAll: false  // Enable plugins
  }
}

// Create the core application
const coreApp = createSonicJSApp(config)

// Create main app and mount plugin routes
const app = new Hono()

// Mount contact form plugin routes explicitly
app.route('/', contactFormPlugin.routes![0].handler) // Public routes
app.route('/admin/plugins/contact-form', contactFormPlugin.routes![1].handler) // Admin routes

// Mount core app
app.route('/', coreApp)

export default app
