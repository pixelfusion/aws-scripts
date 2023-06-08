#!/bin/bash

# Check if a version parameter is provided
if [ $# -eq 0 ]; then
  echo "Error: Version parameter is missing."
  exit 1
fi

# Store the version parameter
version=$1

# Update package.json with the provided version
jq --arg version "$version" '.version = $version' package.json > package-temp.json
mv package-temp.json package.json

# Commit the package.json changes
git add package.json
git commit -m "chore: update package version"

# Push the changes to origin
git push origin

echo "Package version updated successfully to $version and changes pushed to origin."
