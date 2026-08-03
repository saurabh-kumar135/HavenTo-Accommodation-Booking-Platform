#!/bin/bash
export JAVA_HOME=/home/saurabh-kumar123/Desktop/Desktop/express/jdk-17.0.19+10
export ANDROID_HOME=/home/saurabh-kumar123/Desktop/Desktop/express/android-sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH

cd /home/saurabh-kumar123/Desktop/Desktop/express/HavenToApp

echo "=== STEP 1: Re-bind ADB reverse ports ==="
adb reverse tcp:8081 tcp:8081
adb reverse --list

echo ""
echo "=== STEP 2: Start Metro Server ==="
pkill -f "expo start" 2>/dev/null || true
(EXPO_NO_AUTO_INSTALL=1 npx expo start --dev-client --host localhost > /tmp/haventoapp_metro.log 2>&1 &)
sleep 10
cat /tmp/haventoapp_metro.log | tail -20

echo ""
echo "=== STEP 3: Send Dev Client Intent ==="
adb shell am start -a android.intent.action.VIEW -d "exp+havento-app://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
sleep 15

echo ""
echo "=== STEP 4: Confirm mCurrentFocus ==="
adb shell dumpsys window | grep -i "mCurrentFocus"

echo ""
echo "=== STEP 5: Pull Screenshot ==="
adb shell screencap -p /sdcard/havento_app_signup_attempt_check.png
adb pull /sdcard/havento_app_signup_attempt_check.png ./havento_app_signup_attempt_check.png
cp ./havento_app_signup_attempt_check.png /home/saurabh-kumar123/.gemini/antigravity/brain/ada8a314-a35c-41ca-b59b-3b77b8b3ab06/havento_app_signup_attempt_check.png
echo "Screenshot saved to HavenToApp/havento_app_signup_attempt_check.png"
