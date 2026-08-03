import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [userType, setUserType]   = useState('guest');
  const [loading, setLoading]     = useState(false);

  const handleSignup = async () => {
    if (!firstName.trim() || !email.trim() || !password.trim() || !confirm.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    const result = await signup({ 
      firstName: firstName.trim(), 
      lastName: lastName.trim(), 
      email: email.trim(), 
      password, 
      confirmPassword: confirm,
      userType
    });
    setLoading(false);
    if (!result.success) {
      const msg = Array.isArray(result.errors) ? result.errors.join('\n') : (result.error || 'Could not create account.');
      Alert.alert('Signup Failed', msg);
    } else {
      Alert.alert('Success', 'Account created successfully! Please log in.', [
        { text: 'OK', onPress: () => navigation.replace('Login') }
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>🏠 HavenTo</Text>
          <Text style={styles.subtitle}>Create your account</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Get started</Text>

          <Text style={styles.label}>I am joining as *</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity 
              style={[styles.roleTab, userType === 'guest' && styles.roleTabActive]} 
              onPress={() => setUserType('guest')}
            >
              <Text style={[styles.roleText, userType === 'guest' && styles.roleTextActive]}>Guest</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.roleTab, userType === 'host' && styles.roleTabActive]} 
              onPress={() => setUserType('host')}
            >
              <Text style={[styles.roleText, userType === 'host' && styles.roleTextActive]}>Host</Text>
            </TouchableOpacity>
          </View>

          {/* Name row */}
          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput style={styles.input} placeholder="John" placeholderTextColor="#9ca3af"
                value={firstName} onChangeText={setFirstName} />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput style={styles.input} placeholder="Doe" placeholderTextColor="#9ca3af"
                value={lastName} onChangeText={setLastName} />
            </View>
          </View>

          <Text style={styles.label}>Email *</Text>
          <TextInput style={styles.input} placeholder="your.email@example.com"
            placeholderTextColor="#9ca3af" value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>Password *</Text>
          <TextInput style={styles.input} placeholder="Min. 8 characters"
            placeholderTextColor="#9ca3af" value={password} onChangeText={setPassword}
            secureTextEntry />

          <Text style={styles.label}>Confirm Password *</Text>
          <TextInput style={styles.input} placeholder="Confirm your password"
            placeholderTextColor="#9ca3af" value={confirm} onChangeText={setConfirm}
            secureTextEntry />

          <Text style={styles.hintText}>
            Password must be 8+ chars with uppercase, lowercase, number, and special character (!@&).
          </Text>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Create Account</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.switchText}>
              Already have an account? <Text style={styles.switchLink}>Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f9fafb' },
  inner:      { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header:     { alignItems: 'center', marginBottom: 32 },
  logo:       { fontSize: 36, fontWeight: '700', color: '#ef4444' },
  subtitle:   { fontSize: 16, color: '#6b7280', marginTop: 4 },
  card:       { backgroundColor: '#fff', borderRadius: 16, padding: 24, elevation: 4,
                shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  title:      { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 16 },
  roleRow:    { flexDirection: 'row', gap: 10, marginBottom: 16 },
  roleTab:    { flex: 1, backgroundColor: '#f3f4f6', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  roleTabActive: { backgroundColor: '#ef4444' },
  roleText:   { fontSize: 14, fontWeight: '600', color: '#4b5563' },
  roleTextActive: { color: '#ffffff' },
  row:        { flexDirection: 'row', gap: 12 },
  half:       { flex: 1 },
  label:      { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input:      { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 14,
                paddingVertical: 12, fontSize: 15, color: '#111827', marginBottom: 12, backgroundColor: '#f9fafb' },
  hintText:   { fontSize: 12, color: '#6b7280', marginBottom: 16, marginTop: -4 },
  button:     { backgroundColor: '#ef4444', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { backgroundColor: '#fca5a5' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchText: { textAlign: 'center', marginTop: 20, color: '#6b7280', fontSize: 14 },
  switchLink: { color: '#ef4444', fontWeight: '600' },
});
