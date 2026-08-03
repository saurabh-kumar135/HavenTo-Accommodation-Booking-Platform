import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getBookings } from '../../services/api';

export default function BookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    try {
      const res = await getBookings();
      if (res.data.success) setBookings(res.data.bookings || []);
    } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#ef4444" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>📅 My Bookings</Text>
      <FlatList
        data={bookings}
        keyExtractor={(item, i) => item._id || String(i)}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBookings(); }} colors={['#ef4444']} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.home?.houseName || 'Property'}</Text>
            <Text style={styles.loc}>📍 {item.home?.location}</Text>
            <Text style={styles.date}>🗓 {new Date(item.createdAt).toLocaleDateString()}</Text>
            <View style={[styles.badge, { backgroundColor: item.status === 'confirmed' ? '#dcfce7' : '#fef3c7' }]}>
              <Text style={{ color: item.status === 'confirmed' ? '#16a34a' : '#d97706', fontWeight: '600', fontSize: 13 }}>
                {item.status || 'Pending'}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No bookings yet.</Text>}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  name: { fontSize: 17, fontWeight: '600', color: '#111827' },
  loc: { color: '#6b7280', marginTop: 4, fontSize: 14 },
  date: { color: '#6b7280', marginTop: 2, fontSize: 14 },
  badge: { marginTop: 8, alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 16 },
});
