#!/bin/bash
export JAVA_HOME=/home/saurabh-kumar123/Desktop/Desktop/express/jdk-17.0.19+10
export ANDROID_HOME=/home/saurabh-kumar123/Desktop/Desktop/express/android-sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH

cd /home/saurabh-kumar123/Desktop/Desktop/express/HavenToApp

echo "=== STEP 1: Kill Expo processes ==="
pkill -f "expo start" 2>/dev/null || true
sleep 2

echo ""
echo "=== STEP 2: Uninstall com.havento.mobile ==="
adb uninstall com.havento.mobile 2>/dev/null || echo "not installed"

echo ""
echo "=== STEP 3: Install expo-dev-client ==="
npx expo install expo-dev-client

echo ""
echo "=== STEP 4: Clean prebuild android ==="
npx expo prebuild --platform android

echo ""
echo "=== STEP 5: Build & Install com.havento.app APK ==="
npx expo run:android

echo ""
echo "=== STEP 6: Reverse Port Tunnels ==="
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3009 tcp:3009

echo ""
echo "=== STEP 7: Confirm mCurrentFocus ==="
sleep 10
adb shell dumpsys window | grep -i "mCurrentFocus"

echo ""
echo "=== STEP 8: Capture Screenshot ==="
adb shell screencap -p /sdcard/havento_app_correct_build.png
adb pull /sdcard/havento_app_correct_build.png ./havento_app_correct_build.png
cp ./havento_app_correct_build.png /home/saurabh-kumar123/.gemini/antigravity/brain/ada8a314-a35c-41ca-b59b-3b77b8b3ab06/havento_app_correct_build.png
echo "Screenshot saved to HavenToApp/havento_app_correct_build.png"

echo ""
echo "=== STEP 9: Logcat Check ==="
adb logcat -d -t 60 | grep -i "fatal\|error\|expo\|reactnative" | tail -40
