#!/bin/bash
# Fix wrangler.toml on all any-type PR branches

set -e

BRANCHES=(
  "refactor/types-app"
  "refactor/types-plugin-middleware"
  "refactor/types-tinymce-plugin"
  "refactor/types-easy-mdx-plugin"
)

UPSTREAM_KV_ID="a16f8246fc294d809c90b0fb2df6d363"
UPSTREAM_KV_PREVIEW="25360861fb2745fab3b1ef2f0f13ffc8"
UPSTREAM_R2="my-sonicjs-app-media"

echo "🔧 Fixing wrangler.toml on all any-type branches..."
echo ""

for BRANCH in "${BRANCHES[@]}"; do
  echo "📝 Processing branch: $BRANCH"
  
  # Checkout branch
  git checkout "$BRANCH"
  
  # Check if wrangler.toml has wrong IDs
  if grep -q "f0814f19589a484da200cc3c3ba4d717" my-sonicjs-app/wrangler.toml; then
    echo "   ❌ Found fork KV ID, fixing..."
    
    # Replace fork KV ID with upstream KV ID
    sed -i "s/f0814f19589a484da200cc3c3ba4d717/$UPSTREAM_KV_ID/g" my-sonicjs-app/wrangler.toml
    
    # Replace fork R2 bucket with upstream R2
    sed -i "s/sonicjs-ci-media/$UPSTREAM_R2/g" my-sonicjs-app/wrangler.toml
    
    # Commit
    git add my-sonicjs-app/wrangler.toml
    git commit -m "fix: restore upstream wrangler.toml resource IDs for CI compatibility

The branch had fork-specific Cloudflare resource IDs which don't exist
in the upstream account. Restoring upstream IDs:
- KV: $UPSTREAM_KV_ID
- R2: $UPSTREAM_R2

This allows upstream CI to deploy and test the changes."
    
    # Push
    git push --force-with-lease origin "$BRANCH"
    
    echo "   ✅ Fixed and pushed!"
  else
    echo "   ✓ Already has correct IDs, skipping"
  fi
  
  echo ""
done

echo "🎉 All branches fixed!"
echo ""
echo "PRs will automatically re-run CI with the updated wrangler.toml"
