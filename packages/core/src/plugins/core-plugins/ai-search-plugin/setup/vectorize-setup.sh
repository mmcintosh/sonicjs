#!/bin/bash

# AI Search Plugin - Vectorize Setup Script
# This script sets up Cloudflare Vectorize for Custom RAG
# Can be run by any SonicJS user

set -e

echo "🔍 AI Search Plugin - Vectorize Setup"
echo "====================================="
echo ""

# Check if we're in the right directory
if [ ! -f "wrangler.toml" ]; then
    echo "❌ Error: wrangler.toml not found!"
    echo "Please run this script from your SonicJS app directory (e.g., my-sonicjs-app/)"
    exit 1
fi

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: Wrangler CLI not found!"
    echo "Install it with: npm install -g wrangler"
    exit 1
fi

# Get index name (default: sonicjs-search)
INDEX_NAME="${1:-sonicjs-search}"

echo "📦 Creating Vectorize index: $INDEX_NAME"
echo ""

# Check if index already exists
if wrangler vectorize list 2>&1 | grep -q "$INDEX_NAME"; then
    echo "✅ Vectorize index '$INDEX_NAME' already exists"
    echo ""
else
    # Create Vectorize index
    echo "Creating new Vectorize index..."
    wrangler vectorize create "$INDEX_NAME" \
        --dimensions=768 \
        --metric=cosine \
        --preset=@cf/baai/bge-base-en-v1.5
    
    echo ""
    echo "✅ Vectorize index created successfully!"
    echo ""
fi

# Check if binding already exists in wrangler.toml
if grep -q "binding = \"VECTORIZE\"" wrangler.toml; then
    echo "✅ Vectorize binding already configured in wrangler.toml"
else
    echo "📝 Adding Vectorize binding to wrangler.toml..."
    
    # Add binding to wrangler.toml
    cat >> wrangler.toml << EOF

# Vectorize binding for AI Search
[[vectorize]]
binding = "VECTORIZE"
index_name = "$INDEX_NAME"
EOF
    
    echo "✅ Vectorize binding added to wrangler.toml"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Restart your development server: npm run dev"
echo "2. Go to /admin/plugins/ai-search"
echo "3. Enable AI Search and select collections"
echo "4. Click 'Save Settings' to start indexing"
echo ""
echo "Your AI Search will be ready in a few moments!"
