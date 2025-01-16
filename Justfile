release:
	#!/usr/bin/env bash
	set -euo pipefail
	
	# Install dependencies
	pnpm install
	
	# Build the project
	node esbuild.config.mjs production
	
	# Sync versions
	pnpm run version
	
	# Extract version and create release
	VERSION="$(cat package.json | jq -r .version)"
	gh release create "$VERSION" \
		--title "$VERSION" \
		--generate-notes \
		main.js manifest.json styles.css

# Bump the semantic version by the specified level (major, minor, or patch)
bump-version level:
	#!/usr/bin/env bash
	set -euo pipefail
	
	# Read current version
	current_version=$(cat package.json | jq -r .version)
	IFS='.' read -r major minor patch <<< "$current_version"
	
	# Calculate new version based on level
	case "{{level}}" in
		"major")
			new_version="$((major + 1)).0.0"
			;;
		"minor")
			new_version="${major}.$((minor + 1)).0"
			;;
		"patch")
			new_version="${major}.${minor}.$((patch + 1))"
			;;
		*)
			echo "Error: level must be one of: major, minor, patch"
			exit 1
			;;
	esac
	
	# Update package.json with new version
	tmp=$(mktemp)
	jq ".version = \"$new_version\"" package.json > "$tmp" && mv "$tmp" package.json
	echo "Version bumped from $current_version to $new_version"
