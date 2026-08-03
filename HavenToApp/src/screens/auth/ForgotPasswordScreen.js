import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { API_URL } from '../../config/api';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return Alert.alert('Error', 'Please enter your email.');
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/password-reset/request`, { email: email.trim() });
      Alert.alert('Check your email', 'A password reset link has been sent.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Could not send reset email.');
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.sub}>Enter your email and we'll send you a reset link.</Text>
      <TextInput style={styles.input} placeholder="your.email@example.com"
        placeholderTextColor="#9ca3af" value={email} onChangeText={setEmail}
        keyboardType="email-address" autoCapitalize="none" />
      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Reset Link</Text>}
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f9fafb', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  sub: { color: '#6b7280', marginBottom: 24, fontSize: 15 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12,
    fontSize: 15, color: '#111827', marginBottom: 20, backgroundColor: '#fff' },
  button: { backgroundColor: '#ef4444', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
