#!/bin/bash
export JAVA_HOME=/home/saurabh-kumar123/Desktop/Desktop/express/jdk-17.0.19+10
export ANDROID_HOME=/home/saurabh-kumar123/Desktop/Desktop/express/android-sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH

cd /home/saurabh-kumar123/Desktop/Desktop/express/HavenToApp

echo "=== STEP 1: Re-bind ADB reverse ports ==="
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3009 tcp:3009
adb reverse --list

echo ""
echo "=== STEP 2: Start Metro for HavenToApp ==="
pkill -f "expo start" 2>/dev/null || true
(EXPO_NO_AUTO_INSTALL=1 npx expo start --dev-client --host localhost > /tmp/haventoapp_metro.log 2>&1 &)
sleep 10

echo ""
echo "=== STEP 3: Send Dev Client Intent ==="
adb shell am start -n com.havento.app/.MainActivity
sleep 15

echo ""
echo "=== STEP 4: Confirm mCurrentFocus ==="
adb shell dumpsys window | grep -i "mCurrentFocus"

echo ""
echo "=== STEP 5: Capture Screenshot ==="
adb shell screencap -p /sdcard/havento_app_signup_ready.png
adb pull /sdcard/havento_app_signup_ready.png ./havento_app_signup_ready.png
cp ./havento_app_signup_ready.png /home/saurabh-kumar123/.gemini/antigravity/brain/ada8a314-a35c-41ca-b59b-3b77b8b3ab06/havento_app_signup_ready.png
echo "Screenshot saved to HavenToApp/havento_app_signup_ready.png"
