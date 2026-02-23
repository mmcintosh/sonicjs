import { renderAdminLayoutCatalyst, AdminLayoutCatalystData } from '../layouts/admin-layout-catalyst.template'

export interface APIDocsPageData {
  user?: {
    name: string
    email: string
    role: string
  }
  version?: string
}

export function renderAPIDocsPage(data: APIDocsPageData): string {
  const pageContent = `
    <div id="scalar-api-docs" style="min-height: calc(100vh - 100px);"></div>

    <script
      id="api-reference"
      data-url="/api"
      data-configuration="${encodeHTMLAttribute(JSON.stringify({
        theme: 'kepler',
        layout: 'modern',
        darkMode: true,
        hideModels: false,
        hideDownloadButton: false,
        hiddenClients: [],
        defaultHttpClient: {
          targetKey: 'javascript',
          clientKey: 'fetch'
        },
        metaData: {
          title: 'SonicJS API Documentation'
        }
      }))}"
    >
    </script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>

    <style>
      /* Override Scalar's styles to work within admin layout */
      .scalar-app {
        --scalar-background-1: transparent !important;
      }
      /* Ensure the Scalar container fills the available space */
      #scalar-api-docs {
        position: relative;
      }
      /* Hide Scalar's built-in header since we have the admin layout */
      .scalar-app .t-app__header {
        display: none !important;
      }
    </style>
  `

  const layoutData: AdminLayoutCatalystData = {
    title: 'API Docs',
    pageTitle: 'API Documentation',
    currentPath: '/admin/api-docs',
    user: data.user,
    version: data.version,
    content: pageContent
  }

  return renderAdminLayoutCatalyst(layoutData)
}

function encodeHTMLAttribute(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
