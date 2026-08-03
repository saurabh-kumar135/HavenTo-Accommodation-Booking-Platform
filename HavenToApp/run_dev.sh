#!/bin/bash
export ANDROID_HOME=/home/saurabh-kumar123/Desktop/Desktop/express/android-sdk
export PATH=$ANDROID_HOME/platform-tools:$PATH

cd /home/saurabh-kumar123/Desktop/Desktop/express/HavenToApp

echo "=== STEP 1: Confirm mCurrentFocus ==="
adb shell dumpsys window | grep -i "mCurrentFocus"

echo ""
echo "=== STEP 2: Configure ADB Reverse Tunnels ==="
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3009 tcp:3009

echo ""
echo "=== STEP 3: Start Metro for HavenToApp ==="
pkill -f "expo start" 2>/dev/null || true
(EXPO_NO_AUTO_INSTALL=1 npx expo start --dev-client --host localhost > /tmp/haventoapp_metro.log 2>&1 &)
EXPO_PID=$!
sleep 15
cat /tmp/haventoapp_metro.log

echo ""
echo "=== STEP 4: Launch Dev Client Intent ==="
adb shell am start -a android.intent.action.VIEW -d "exp+havento-mobile://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
sleep 15

echo ""
echo "=== STEP 5: Confirm mCurrentFocus ==="
adb shell dumpsys window | grep -i "mCurrentFocus"

echo ""
echo "=== STEP 6: Capture Screenshot ==="
adb shell screencap -p /sdcard/havento_app_signup_precheck.png
adb pull /sdcard/havento_app_signup_precheck.png ./havento_app_signup_precheck.png
cp ./havento_app_signup_precheck.png /home/saurabh-kumar123/.gemini/antigravity/brain/ada8a314-a35c-41ca-b59b-3b77b8b3ab06/havento_app_signup_precheck.png
echo "Screenshot saved to HavenToApp/havento_app_signup_precheck.png"
