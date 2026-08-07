import { Lucide, type LucideIconName } from '@react-native-vector-icons/lucide';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { feedback } from '@/services/feedback';

const ACTIVE_COLOR = '#2289FD';
const INACTIVE_COLOR = '#7C879C';
const SUBSCRIBE_COLOR = '#D99112';

function TabIcon({ color, name, size }: { color: ColorValue; name: LucideIconName; size: number }) {
  return <Lucide color={color} name={name} size={size} />;
}

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="home"
      screenListeners={{
        tabPress: () => feedback.play('buttonTap'),
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E7EAF0',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home tab',
          tabBarIcon: ({ color, size }) => <TabIcon color={color} name="house" size={size} />,
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{
          title: 'Quests',
          tabBarAccessibilityLabel: 'Quests tab',
          tabBarIcon: ({ color, size }) => <TabIcon color={color} name="trophy" size={size} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarAccessibilityLabel: 'Calendar tab',
          tabBarIcon: ({ color, size }) => <TabIcon color={color} name="calendar-days" size={size} />,
        }}
      />
      <Tabs.Screen
        name="subscribe"
        options={{
          title: 'Subscribe',
          tabBarAccessibilityLabel: 'Subscribe tab',
          tabBarIcon: ({ size }) => <TabIcon color={SUBSCRIBE_COLOR} name="crown" size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: 'Profile tab',
          tabBarIcon: ({ color, size }) => <TabIcon color={color} name="circle-user" size={size} />,
        }}
      />
    </Tabs>
  );
}
