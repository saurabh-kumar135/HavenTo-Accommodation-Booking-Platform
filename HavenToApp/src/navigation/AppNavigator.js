import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

// Auth Screens
import LoginScreen     from '../screens/auth/LoginScreen';
import SignupScreen    from '../screens/auth/SignupScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Main Screens
import HomeListScreen   from '../screens/store/HomeListScreen';
import HomeDetailScreen from '../screens/store/HomeDetailScreen';
import FavouriteScreen  from '../screens/store/FavouriteScreen';
import BookingsScreen   from '../screens/store/BookingsScreen';
import ProfileScreen    from '../screens/ProfileScreen';

// Host Screens
import HostHomeListScreen from '../screens/host/HostHomeListScreen';
import AddEditHomeScreen  from '../screens/host/AddEditHomeScreen';
import LocationPickerScreen from '../screens/host/LocationPickerScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Bottom Tab Navigator (shown when logged in) ────────────────────────────
function MainTabs() {
  const { user } = useAuth();
  const isHost = user?.userType === 'host' || user?.role === 'host';

  const guestIcons = {
    Explore:    ['search', 'search-outline'],
    Favourites: ['heart', 'heart-outline'],
    Bookings:   ['calendar', 'calendar-outline'],
    Profile:    ['person', 'person-outline'],
  };
  const hostIcons = {
    MyProperties: ['home', 'home-outline'],
    AddProperty:  ['add-circle', 'add-circle-outline'],
    Profile:      ['person', 'person-outline'],
  };
  const icons = isHost ? hostIcons : guestIcons;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#ef4444',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { paddingBottom: 5, height: 60 },
        tabBarIcon: ({ focused, color, size }) => {
          const [on, off] = icons[route.name] || ['ellipse', 'ellipse-outline'];
          return <Ionicons name={focused ? on : off} size={size} color={color} />;
        },
      })}
    >
      {isHost ? (
        <>
          <Tab.Screen name="MyProperties" component={HostHomeListScreen} options={{ title: 'My Properties' }} />
          <Tab.Screen name="AddProperty"  component={AddEditHomeScreen}  options={{ title: 'Add Property' }} />
          <Tab.Screen name="Profile"      component={ProfileScreen} />
        </>
      ) : (
        <>
          <Tab.Screen name="Explore"    component={HomeListScreen} />
          <Tab.Screen name="Favourites" component={FavouriteScreen} />
          <Tab.Screen name="Bookings"   component={BookingsScreen} />
          <Tab.Screen name="Profile"    component={ProfileScreen} />
        </>
      )}
    </Tab.Navigator>
  );
}

// ── Root Navigator ─────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { isLoggedIn, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ef4444" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          // ── Logged-in stack ────────────────────────────────────────────
          <>
            <Stack.Screen name="MainTabs"    component={MainTabs} />
            <Stack.Screen name="HomeDetail"  component={HomeDetailScreen}
              options={{ headerShown: true, title: 'Property Details', headerTintColor: '#ef4444' }} />
            <Stack.Screen name="HostHomes"   component={HostHomeListScreen}
              options={{ headerShown: true, title: 'My Properties', headerTintColor: '#ef4444' }} />
            <Stack.Screen name="AddEditHome" component={AddEditHomeScreen}
              options={{ headerShown: true, title: 'List a Property', headerTintColor: '#ef4444' }} />
            <Stack.Screen name="LocationPicker" component={LocationPickerScreen}
              options={{ headerShown: true, title: 'Pick Location', headerTintColor: '#ef4444' }} />
          </>
        ) : (
          // ── Auth stack ─────────────────────────────────────────────────
          <>
            <Stack.Screen name="Login"          component={LoginScreen} />
            <Stack.Screen name="Signup"         component={SignupScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen}
              options={{ headerShown: true, title: 'Forgot Password', headerTintColor: '#ef4444' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
