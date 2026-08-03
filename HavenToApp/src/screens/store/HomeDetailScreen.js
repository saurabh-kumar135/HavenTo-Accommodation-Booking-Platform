import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, FlatList, Dimensions, Modal } from 'react-native';
import { getHomeDetails, addToFavourite, makeBooking } from '../../services/api';
import { getImageUrl } from '../../config/api';

export default function HomeDetailScreen({ route }) {
  const { homeId } = route.params;
  const [home, setHome] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => { fetchDetails(); }, []);

  const fetchDetails = async () => {
    try {
      const res = await getHomeDetails(homeId);
      if (res.data.success) setHome(res.data.home);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleFavourite = async () => {
    try {
      await addToFavourite(homeId);
      Alert.alert('Added!', 'Property added to favourites.');
    }
    catch (e) {
      Alert.alert('Error', 'Could not add to favourites. Please try again.');
    }
  };

  const handleBook = async () => {
    Alert.alert('Book Property', `Confirm booking for ${home?.houseName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        try { await makeBooking({ homeId }); Alert.alert('Success', 'Booking confirmed!'); }
        catch (e) { Alert.alert('Error', 'Booking failed.'); }
      }},
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#ef4444" /></View>;
  if (!home) return <View style={styles.center}><Text>Property not found.</Text></View>;

  const photos = home.photos?.length ? home.photos : ['https://via.placeholder.com/400x300'];
  const screenWidth = Dimensions.get('window').width;

  const openLightbox = (idx) => { setLightboxIndex(idx); setLightboxVisible(true); };
  const nextPhoto = () => setLightboxIndex(i => (i + 1) % photos.length);
  const prevPhoto = () => setLightboxIndex(i => (i - 1 + photos.length) % photos.length);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.galleryGrid}>
        <TouchableOpacity onPress={() => openLightbox(0)} style={styles.galleryMain}>
          <Image source={{ uri: getImageUrl(photos[0]) }} style={styles.galleryImg} />
        </TouchableOpacity>
        <View style={styles.galleryThumbColumn}>
          {photos.slice(1, 5).map((item, idx) => (
            <TouchableOpacity key={idx} onPress={() => openLightbox(idx + 1)} style={styles.galleryThumbWrap}>
              <Image source={{ uri: getImageUrl(item) }} style={styles.galleryImg} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Modal visible={lightboxVisible} transparent animationType="fade"
        onRequestClose={() => setLightboxVisible(false)}>
        <View style={styles.lightboxContainer}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxVisible(false)}>
            <Text style={styles.lightboxCloseTxt}>✕ Close</Text>
          </TouchableOpacity>
          <Text style={styles.lightboxCounter}>{lightboxIndex + 1} / {photos.length}</Text>
          <TouchableOpacity style={styles.lightboxArrowLeft} onPress={prevPhoto}>
            <Text style={styles.lightboxArrowTxt}>‹</Text>
          </TouchableOpacity>
          <Image source={{ uri: getImageUrl(photos[lightboxIndex]) }} style={styles.lightboxImage} resizeMode="contain" />
          <TouchableOpacity style={styles.lightboxArrowRight} onPress={nextPhoto}>
            <Text style={styles.lightboxArrowTxt}>›</Text>
          </TouchableOpacity>
          <FlatList
            data={photos}
            horizontal
            style={styles.lightboxStrip}
            keyExtractor={(item, idx) => idx.toString()}
            renderItem={({ item, index }) => (
              <TouchableOpacity onPress={() => setLightboxIndex(index)}>
                <Image source={{ uri: getImageUrl(item) }}
                  style={[styles.lightboxThumb, index === lightboxIndex && styles.lightboxThumbActive]} />
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
      <View style={styles.body}>
        <Text style={styles.name}>{home.houseName}</Text>
        <Text style={styles.location}>📍 {home.location}</Text>
        <Text style={styles.price}>₹{home.price} <Text style={styles.perNight}>/ night</Text></Text>
        <Text style={styles.rating}>⭐ {home.rating || 'N/A'}</Text>
        {home.description && <Text style={styles.desc}>{home.description}</Text>}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.favBtn} onPress={handleFavourite}>
            <Text style={styles.favBtnText}>♥ Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bookBtn} onPress={handleBook}>
            <Text style={styles.bookBtnText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  galleryGrid: { flexDirection: 'row', height: 260, gap: 4, padding: 4 },
  galleryMain: { flex: 1, marginRight: 2 },
  galleryThumbColumn: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', marginLeft: 2 },
  galleryThumbWrap: { width: '50%', height: '50%', padding: 2 },
  galleryImg: { width: '100%', height: '100%', borderRadius: 6 },
  lightboxContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  lightboxClose: { position: 'absolute', top: 40, right: 20, zIndex: 10 },
  lightboxCloseTxt: { color: '#fff', fontSize: 16 },
  lightboxCounter: { position: 'absolute', top: 44, left: 20, color: '#fff', fontSize: 16 },
  lightboxImage: { width: '90%', height: '65%' },
  lightboxArrowLeft: { position: 'absolute', left: 10, top: '45%', zIndex: 10, padding: 10 },
  lightboxArrowRight: { position: 'absolute', right: 10, top: '45%', zIndex: 10, padding: 10 },
  lightboxArrowTxt: { color: '#fff', fontSize: 40 },
  lightboxStrip: { position: 'absolute', bottom: 30 },
  lightboxThumb: { width: 60, height: 45, borderRadius: 4, marginHorizontal: 4, opacity: 0.5 },
  lightboxThumbActive: { opacity: 1, borderWidth: 2, borderColor: '#ef4444' },
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: 260 },
  body: { padding: 20 },
  name: { fontSize: 22, fontWeight: '700', color: '#111827' },
  location: { color: '#6b7280', marginTop: 4, fontSize: 15 },
  price: { fontSize: 22, fontWeight: '700', color: '#ef4444', marginTop: 12 },
  perNight: { fontSize: 14, fontWeight: '400', color: '#6b7280' },
  rating: { fontSize: 15, marginTop: 6, color: '#374151' },
  desc: { marginTop: 16, color: '#374151', fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  favBtn: { flex: 1, borderWidth: 2, borderColor: '#ef4444', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  favBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
  bookBtn: { flex: 2, backgroundColor: '#ef4444', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
