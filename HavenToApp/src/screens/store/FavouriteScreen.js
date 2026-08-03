import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getFavourites, removeFromFavourite } from '../../services/api';
import HomeCard from '../../components/HomeCard';

export default function FavouriteScreen({ navigation }) {
  const [homes, setHomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchFavourites(); }, []);

  const fetchFavourites = async () => {
    try {
      const res = await getFavourites();
      if (res.data.success) setHomes(res.data.favouriteHomes || res.data.favourites || []);
    } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  };

  const handleRemove = async (id) => {
    try {
      await removeFromFavourite(id);
      setHomes(prev => prev.filter(h => h._id !== id));
    } catch (e) { Alert.alert('Error', 'Could not remove.'); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#ef4444" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>❤️ My Favourites</Text>
      <FlatList
        data={homes}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFavourites(); }} colors={['#ef4444']} />}
        renderItem={({ item }) => (
          <HomeCard home={item}
            onPress={() => navigation.navigate('HomeDetail', { homeId: item._id })}
            onRemove={() => handleRemove(item._id)}
            showRemove />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No favourites yet. Start exploring!</Text>}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827', padding: 16 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 16 },
});
