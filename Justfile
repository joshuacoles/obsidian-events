release:
	# Install dependencies
	pnpm install
	
	# Build the project
	pnpm run build
	
	# Bump version
	pnpm run version
	
	# Extract version from package.json
	VERSION=$(cat package.json | jq -r .version)
	
	# Create GitHub release
	gh release create "v$VERSION" \
		--title "v$VERSION" \
		--generate-notes \
		main.js manifest.json styles.css
