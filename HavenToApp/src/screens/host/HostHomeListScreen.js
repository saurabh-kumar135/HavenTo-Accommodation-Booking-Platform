import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getHostHomes, deleteHome } from '../../services/api';
import HomeCard from '../../components/HomeCard';

export default function HostHomeListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [homes, setHomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchHomes(); }, []);

  const fetchHomes = async () => {
    try {
      const res = await getHostHomes();
      if (res.data.success) setHomes(res.data.registeredHomes || res.data.homes || []);
    } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Property', 'Are you sure you want to delete this property?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteHome(id); setHomes(prev => prev.filter(h => h._id !== id)); }
        catch (e) { Alert.alert('Error', 'Could not delete.'); }
      }},
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#ef4444" /></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddEditHome')}>
        <Text style={styles.addBtnText}>+ Add New Property</Text>
      </TouchableOpacity>
      <FlatList
        data={homes}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHomes(); }} colors={['#ef4444']} />}
        renderItem={({ item }) => (
          <HomeCard home={item}
            onPress={() => navigation.navigate('AddEditHome', { homeId: item._id })}
            onDelete={() => handleDelete(item._id)}
            showEdit showDelete />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No properties listed yet.</Text>}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addBtn: { backgroundColor: '#ef4444', marginTop: 20, marginHorizontal: 16, marginBottom: 8, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 16 },
});
