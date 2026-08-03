import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getHomes } from '../../services/api';
import HomeCard from '../../components/HomeCard';

export default function HomeListScreen({ navigation }) {
  const [homes, setHomes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchHomes(); }, []);
  useEffect(() => {
    setFiltered(homes.filter(h =>
      h.houseName?.toLowerCase().includes(search.toLowerCase()) ||
      h.location?.toLowerCase().includes(search.toLowerCase())
    ));
  }, [search, homes]);

  const fetchHomes = async () => {
    try {
      const res = await getHomes();
      if (res.data.success) { setHomes(res.data.registeredHomes); setFiltered(res.data.registeredHomes); }
    } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#ef4444" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🏠 HavenTo</Text>
        <TextInput style={styles.search} placeholder="Search by name or location..."
          placeholderTextColor="#9ca3af" value={search} onChangeText={setSearch} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => item._id}
        numColumns={1}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHomes(); }} colors={['#ef4444']} />}
        renderItem={({ item }) => (
          <HomeCard home={item} onPress={() => navigation.navigate('HomeDetail', { homeId: item._id })} />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No properties found.</Text>}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderColor: '#e5e7eb' },
  logo: { fontSize: 24, fontWeight: '700', color: '#ef4444', marginBottom: 10 },
  search: { backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 16 },
});
