#!/bin/bash
# Monitor both fork PRs during two-stage testing validation

echo "======================================"
echo "  Two-Stage Testing - CI Monitor"
echo "======================================"
echo ""

echo "🧪 FORK PR #9 (Sanitize - TEST)"
echo "Branch: refactor/types-sanitize"
gh run list --repo mmcintosh/sonicjs --branch refactor/types-sanitize --limit 1 --json status,conclusion,createdAt,databaseId,url | jq -r '.[] | "  Run ID: \(.databaseId)\n  Status: \(.status)\n  Conclusion: \(.conclusion // "N/A")\n  URL: \(.url)\n  Started: \(.createdAt)"'
echo ""

echo "🔌 FORK PR #2 (Contact Form)"
echo "Branch: feature/contact-plugin-v1"
gh run list --repo mmcintosh/sonicjs --branch feature/contact-plugin-v1 --limit 1 --json status,conclusion,createdAt,databaseId,url | jq -r '.[] | "  Run ID: \(.databaseId)\n  Status: \(.status)\n  Conclusion: \(.conclusion // "N/A")\n  URL: \(.url)\n  Started: \(.createdAt)"'
echo ""

echo "======================================"
echo "  Quick commands:"
echo "======================================"
echo "  View sanitize logs:  gh run view [RUN_ID] --repo mmcintosh/sonicjs --log"
echo "  View contact logs:   gh run view [RUN_ID] --repo mmcintosh/sonicjs --log"
echo ""
