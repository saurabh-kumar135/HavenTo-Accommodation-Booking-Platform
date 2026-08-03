import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { addHome, editHome, getHomeDetails } from '../../services/api';

export default function AddEditHomeScreen({ route, navigation }) {
  const homeId = route?.params?.homeId;
  const isEdit = !!homeId;

  const [houseName, setHouseName] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Property' : 'List a Property' });
  }, [isEdit, navigation]);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Property' : 'List a Property' });
  }, [isEdit, navigation]);

  useEffect(() => {
    if (isEdit) {
      getHomeDetails(homeId)
        .then(res => {
          const home = res.data.home;
          if (home) {
            setHouseName(home.houseName || '');
            setLocation(home.location || '');
            setPrice(home.price ? String(home.price) : '');
            setDescription(home.description || '');
          }
        })
        .catch(e => console.error('Could not fetch property details:', e))
        .finally(() => setFetching(false));
    }
  }, [homeId]);

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Please allow photo access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled) setPhotos(result.assets);
  };

  const handleSubmit = async () => {
    if (!houseName.trim() || !location.trim() || !price.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    if (!isEdit && photos.length === 0) {
      Alert.alert('Photos Required', 'Please select at least 1 photo before listing your property.');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      if (isEdit) fd.append('id', homeId);
      fd.append('houseName', houseName);
      fd.append('location', location);
      fd.append('price', price);
      fd.append('description', description);
      photos.forEach((p, i) => {
        fd.append('photos', { uri: p.uri, name: `photo_${i}.jpg`, type: 'image/jpeg' });
      });
      const res = isEdit ? await editHome(fd) : await addHome(fd);
      if (res.data.success) {
        Alert.alert('Success', isEdit ? 'Property updated successfully!' : 'Property listed successfully!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (e) {
      Alert.alert(
        'Error',
        e.response?.data?.message || e.message || 'Could not save property.'
      );
    } finally { setLoading(false); }
  };

  if (fetching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ef4444" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Property Name *</Text>
      <TextInput style={styles.input} placeholder="e.g. Cozy Beach Cottage" placeholderTextColor="#9ca3af" value={houseName} onChangeText={setHouseName} />
      <Text style={styles.label}>Location *</Text>
      <TextInput style={styles.input} placeholder="e.g. Goa, India" placeholderTextColor="#9ca3af" value={location} onChangeText={setLocation} />
      <Text style={styles.label}>Price per night (₹) *</Text>
      <TextInput style={styles.input} placeholder="e.g. 2500" placeholderTextColor="#9ca3af" value={price} onChangeText={setPrice} keyboardType="numeric" />
      <Text style={styles.label}>Description</Text>
      <TextInput style={[styles.input, styles.textarea]} placeholder="Describe your property..." placeholderTextColor="#9ca3af" value={description} onChangeText={setDescription} multiline numberOfLines={4} />
      <TouchableOpacity style={styles.photoBtn} onPress={pickImages}>
        <Text style={styles.photoBtnText}>📷 {photos.length > 0 ? `${photos.length} photo(s) selected` : (isEdit ? 'Update Photos (Optional)' : 'Select Photos')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{isEdit ? 'Update Property' : 'List Property'}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  inner: { padding: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', marginBottom: 16, backgroundColor: '#fff' },
  textarea: { height: 100, textAlignVertical: 'top' },
  photoBtn: { borderWidth: 1.5, borderColor: '#ef4444', borderRadius: 10, borderStyle: 'dashed', paddingVertical: 16, alignItems: 'center', marginBottom: 20 },
  photoBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
  submitBtn: { backgroundColor: '#ef4444', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
