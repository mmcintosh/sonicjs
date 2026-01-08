#!/bin/bash
# cleanup-ci-databases.sh
# Cleans up old CI test databases from Cloudflare

set -e

echo "🗑️  Cleaning up old CI databases..."
echo ""

# Get list of PR databases
DB_LIST=$(npx wrangler d1 list --json 2>/dev/null)

if [ -z "$DB_LIST" ] || [ "$DB_LIST" == "[]" ]; then
  echo "❌ No databases found or wrangler not authenticated"
  exit 1
fi

# Count total PR databases
PR_DB_COUNT=$(echo "$DB_LIST" | jq '[.[] | select(.name | startswith("sonicjs-pr-"))] | length')
echo "Found $PR_DB_COUNT PR test databases"

if [ "$PR_DB_COUNT" -eq 0 ]; then
  echo "✅ No PR databases to clean up"
  exit 0
fi

# Show databases to be deleted
echo ""
echo "Databases to delete:"
echo "$DB_LIST" | jq -r '.[] | select(.name | startswith("sonicjs-pr-")) | "  - \(.name) (ID: \(.uuid))"'

echo ""
echo "⚠️  This will permanently delete these databases!"
read -p "Delete these databases? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  DELETED=0
  FAILED=0
  
  echo "$DB_LIST" | \
    jq -r '.[] | select(.name | startswith("sonicjs-pr-")) | "\(.uuid)|\(.name)"' | \
    while IFS='|' read -r db_id db_name; do
      echo "Deleting $db_name..."
      if npx wrangler d1 delete "$db_id" --skip-confirmation 2>/dev/null; then
        ((DELETED++)) || true
      else
        echo "  ⚠️  Failed to delete $db_name"
        ((FAILED++)) || true
      fi
    done
  
  echo ""
  echo "✅ Cleanup complete!"
  echo "   Deleted: $DELETED databases"
  [ $FAILED -gt 0 ] && echo "   Failed: $FAILED databases"
else
  echo "❌ Cleanup cancelled"
fi
