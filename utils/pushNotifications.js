const { Expo } = require('expo-server-sdk');
const expo = new Expo();

async function sendPushNotification(pushToken, title, body, data = {}) {
  if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
    console.log(`Skipping push: invalid or missing token (${pushToken})`);
    return;
  }
  const messages = [{
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
  }];
  try {
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      const ticket = await expo.sendPushNotificationsAsync(chunk);
      console.log('Push ticket:', ticket);
    }
  } catch (err) {
    console.error('Push notification error:', err);
  }
}

module.exports = { sendPushNotification };
