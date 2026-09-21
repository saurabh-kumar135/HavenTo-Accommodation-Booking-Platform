#!/bin/bash
# ==============================================================================
# HavenTo Android Standalone Release Build Script
# ==============================================================================
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$APP_DIR/android"
EXPRESS_DIR="$(cd "$APP_DIR/../.." && pwd)"

export JAVA_HOME="$EXPRESS_DIR/jdk-17.0.19+10"
export ANDROID_HOME="$EXPRESS_DIR/android-sdk"
export PATH="$JAVA_HOME/bin:/home/saurabh-kumar123/.nvm/versions/node/v24.12.0/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

echo "=========================================="
echo "🚀 Building HavenTo Standalone Release APK"
echo "=========================================="
echo "• Java Home:    $JAVA_HOME"
echo "• Android Home: $ANDROID_HOME"

cd "$ANDROID_DIR"

# Clean any lingering daemons to protect RAM
./gradlew --stop 2>/dev/null || true

# Assemble Release APK safely with bounded memory
./gradlew assembleRelease --no-daemon

OUTPUT_APK="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
DEST_APK="$APP_DIR/HavenTo-release.apk"

if [ -f "$OUTPUT_APK" ]; then
  cp "$OUTPUT_APK" "$DEST_APK"
  echo ""
  echo "=========================================="
  echo "✅ BUILD SUCCESSFUL!"
  echo "📦 Standalone APK created at:"
  echo "   $DEST_APK"
  echo "=========================================="
else
  echo "❌ Build failed: output APK not found."
  exit 1
fi
