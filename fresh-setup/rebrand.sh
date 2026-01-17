#!/bin/bash

# =============================================
# REBRAND SCRIPT
# Applies brand configuration to all template files
# =============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/brand.config.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  Fresh Setup Rebrand Tool${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required but not installed.${NC}"
    echo "Install with: brew install jq (macOS) or apt install jq (Linux)"
    exit 1
fi

# Check if config exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Error: brand.config.json not found${NC}"
    exit 1
fi

# Read config values
APP_NAME=$(jq -r '.app.name' "$CONFIG_FILE")
APP_NAME_LOWER=$(jq -r '.app.name_lowercase' "$CONFIG_FILE")
APP_TAGLINE=$(jq -r '.app.tagline' "$CONFIG_FILE")
APP_DESCRIPTION=$(jq -r '.app.description' "$CONFIG_FILE")
SESSION_KEY=$(jq -r '.session.storage_key' "$CONFIG_FILE")
AVATARS_BUCKET=$(jq -r '.storage.avatars_bucket' "$CONFIG_FILE")
PHOTOS_BUCKET=$(jq -r '.storage.photos_bucket' "$CONFIG_FILE")
CURRENCY=$(jq -r '.payments.currency' "$CONFIG_FILE")
GITHUB_REPO=$(jq -r '.urls.github_repo' "$CONFIG_FILE")
PROD_DOMAIN=$(jq -r '.urls.production_domain' "$CONFIG_FILE")
PROJECT_DEV=$(jq -r '.supabase.project_name_dev' "$CONFIG_FILE")
PROJECT_STAGING=$(jq -r '.supabase.project_name_staging' "$CONFIG_FILE")
PROJECT_PROD=$(jq -r '.supabase.project_name_prod' "$CONFIG_FILE")

echo -e "${YELLOW}Configuration:${NC}"
echo "  App Name: $APP_NAME"
echo "  Lowercase: $APP_NAME_LOWER"
echo "  Tagline: $APP_TAGLINE"
echo "  Session Key: $SESSION_KEY"
echo ""

# Function to escape special characters for sed
escape_sed() {
    echo "$1" | sed -e 's/[\/&]/\\&/g'
}

# Function to replace placeholders in a file
replace_in_file() {
    local file=$1
    if [ -f "$file" ]; then
        # Create temp file
        local temp_file=$(mktemp)

        # Escape values that might contain special characters
        local escaped_github=$(escape_sed "$GITHUB_REPO")
        local escaped_tagline=$(escape_sed "$APP_TAGLINE")
        local escaped_description=$(escape_sed "$APP_DESCRIPTION")

        # Replace all placeholders using | as delimiter for URLs
        sed -e "s|__APP_NAME__|$APP_NAME|g" \
            -e "s|__APP_NAME_LOWER__|$APP_NAME_LOWER|g" \
            -e "s|__APP_TAGLINE__|$escaped_tagline|g" \
            -e "s|__APP_DESCRIPTION__|$escaped_description|g" \
            -e "s|__SESSION_KEY__|$SESSION_KEY|g" \
            -e "s|__AVATARS_BUCKET__|$AVATARS_BUCKET|g" \
            -e "s|__PHOTOS_BUCKET__|$PHOTOS_BUCKET|g" \
            -e "s|__CURRENCY__|$CURRENCY|g" \
            -e "s|__GITHUB_REPO__|$escaped_github|g" \
            -e "s|__PROD_DOMAIN__|$PROD_DOMAIN|g" \
            -e "s|__PROJECT_DEV__|$PROJECT_DEV|g" \
            -e "s|__PROJECT_STAGING__|$PROJECT_STAGING|g" \
            -e "s|__PROJECT_PROD__|$PROJECT_PROD|g" \
            "$file" > "$temp_file"

        mv "$temp_file" "$file"
        echo -e "  ${GREEN}✓${NC} $file"
    fi
}

echo -e "${YELLOW}Applying branding to files...${NC}"

# Process all template files
for file in "$SCRIPT_DIR"/database/*.sql; do
    replace_in_file "$file"
done

for file in "$SCRIPT_DIR"/env-templates/.env*; do
    replace_in_file "$file"
done

for file in "$SCRIPT_DIR"/docs/*.md; do
    replace_in_file "$file"
done

replace_in_file "$SCRIPT_DIR/README.md"

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  Rebranding Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Review the updated files"
echo "  2. Copy env-templates/.env.example to ../.env.local"
echo "  3. Run database scripts in Supabase"
echo "  4. Deploy to Vercel"
echo ""
