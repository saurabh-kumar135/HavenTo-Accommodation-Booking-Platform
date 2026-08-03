import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { getImageUrl } from '../config/api';

export default function HomeCard({ home, onPress, onRemove, onDelete, showRemove, showEdit, showDelete }) {
  const img = home.photos?.[0] ? getImageUrl(home.photos[0]) : (home.photo ? getImageUrl(home.photo) : 'https://via.placeholder.com/400x300');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Image source={{ uri: img }} style={styles.image} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{home.houseName}</Text>
        <Text style={styles.location} numberOfLines={1}>📍 {home.location}</Text>
        <View style={styles.row}>
          <Text style={styles.price}>₹{home.price}<Text style={styles.perNight}>/night</Text></Text>
          <Text style={styles.rating}>⭐ {home.rating || 'N/A'}</Text>
        </View>
        <View style={styles.actions}>
          {showRemove && onRemove && (
            <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
              <Text style={styles.removeTxt}>♥ Remove</Text>
            </TouchableOpacity>
          )}
          {showDelete && onDelete && (
            <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
              <Text style={styles.deleteTxt}>🗑 Delete</Text>
            </TouchableOpacity>
          )}
          {showEdit && onPress && (
            <TouchableOpacity style={styles.editBtn} onPress={onPress}>
              <Text style={styles.editTxt}>✏️ Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 16, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  image: { width: '100%', height: 180 },
  body: { padding: 14 },
  name: { fontSize: 17, fontWeight: '700', color: '#111827' },
  location: { color: '#6b7280', marginTop: 3, fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  price: { fontSize: 18, fontWeight: '700', color: '#ef4444' },
  perNight: { fontSize: 13, fontWeight: '400', color: '#9ca3af' },
  rating: { fontSize: 14, color: '#374151' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  removeBtn: { borderWidth: 1, borderColor: '#ef4444', borderRadius: 7, paddingVertical: 6, paddingHorizontal: 12 },
  removeTxt: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  deleteBtn: { borderWidth: 1, borderColor: '#ef4444', borderRadius: 7, paddingVertical: 6, paddingHorizontal: 12 },
  deleteTxt: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  editBtn: { borderWidth: 1, borderColor: '#3b82f6', borderRadius: 7, paddingVertical: 6, paddingHorizontal: 12 },
  editTxt: { color: '#3b82f6', fontSize: 13, fontWeight: '600' },
});
