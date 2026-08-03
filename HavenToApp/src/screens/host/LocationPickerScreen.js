import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';

const LEAFLET_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style> html, body, #map { height: 100%; margin: 0; padding: 0; } </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map').setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    var marker = null;
    map.on('click', function(e) {
      var lat = e.latlng.lat;
      var lng = e.latlng.lng;
      if (marker) { map.removeLayer(marker); }
      marker = L.marker([lat, lng]).addTo(map);
      window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: lat, longitude: lng }));
    });
  </script>
</body>
</html>
`;

export default function LocationPickerScreen({ navigation, route }) {
  const [selected, setSelected] = useState(null);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      setSelected(data);
    } catch (e) {
      console.log('LocationPicker: could not parse map message', e);
    }
  };

  const handleConfirm = () => {
    if (!selected) return;
    const returnTo = route?.params?.returnTo || 'AddEditHome';
    navigation.navigate({
      name: returnTo,
      params: { pickedLocation: selected },
      merge: true,
    });
  };

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html: LEAFLET_HTML }}
        onMessage={handleMessage}
        style={styles.webview}
      />
      <TouchableOpacity
        style={[styles.confirmButton, !selected && styles.confirmButtonDisabled]}
        onPress={handleConfirm}
        disabled={!selected}
      >
        <Text style={styles.confirmText}>
          {selected
            ? `Confirm Location (${selected.latitude.toFixed(4)}, ${selected.longitude.toFixed(4)})`
            : 'Tap the map to drop a pin'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  confirmButton: { backgroundColor: '#ef4444', paddingVertical: 16, alignItems: 'center' },
  confirmButtonDisabled: { backgroundColor: '#9ca3af' },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
