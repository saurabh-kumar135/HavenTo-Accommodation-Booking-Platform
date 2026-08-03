import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const isHost = user?.userType === 'host' || user?.role === 'host';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.firstName?.[0]?.toUpperCase() || '?'}</Text>
        </View>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        {isHost && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Host</Text>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('HostHomes')}>
              <Text style={styles.menuText}>🏠 My Listed Properties</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AddEditHome')}>
              <Text style={styles.menuText}>➕ List a New Property</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  inner: { alignItems: 'center', padding: 24 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 36, color: '#fff', fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827' },
  email: { color: '#6b7280', marginTop: 4, fontSize: 15, marginBottom: 32 },
  section: { width: '100%', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#9ca3af', padding: 12, paddingBottom: 4, textTransform: 'uppercase' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderColor: '#f3f4f6' },
  menuText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  arrow: { fontSize: 20, color: '#9ca3af' },
  logoutBtn: { marginTop: 16, width: '100%', borderWidth: 1.5, borderColor: '#ef4444', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 16 },
});
