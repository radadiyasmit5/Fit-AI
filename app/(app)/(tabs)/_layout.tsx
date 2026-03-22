import { Tabs } from "expo-router";
import { View } from "react-native";
import Svg, { Path, Rect, Polyline, Circle } from "react-native-svg";
import { AICoach } from "@/components/AICoach";
import { T } from "@/constants/theme";

// FIX 6: Proper SVG icons, stroke="currentColor", fill="none", strokeWidth=2

function DashboardIcon({ color, opacity }: { color: string; opacity: number }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Rect x="3" y="3" width="7" height="7" rx="2" stroke={color} strokeWidth={2} />
      <Rect x="14" y="3" width="7" height="7" rx="2" stroke={color} strokeWidth={2} />
      <Rect x="3" y="14" width="7" height="7" rx="2" stroke={color} strokeWidth={2} />
      <Rect x="14" y="14" width="7" height="7" rx="2" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function NutritionIcon({ color, opacity }: { color: string; opacity: number }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Path d="M18 8h1a4 4 0 0 1 0 8h-1" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function WorkoutIcon({ color, opacity }: { color: string; opacity: number }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Path d="M6.5 6.5v11M17.5 6.5v11" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M2 9h4.5M17.5 9H22M2 15h4.5M17.5 15H22" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M6.5 12h11" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ProgressIcon({ color, opacity }: { color: string; opacity: number }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ProfileIcon({ color, opacity }: { color: string; opacity: number }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" opacity={opacity}>
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={2} />
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const TAB_CONFIG = [
  { name: "index",     title: "Dashboard", Icon: DashboardIcon },
  { name: "nutrition", title: "Nutrition",  Icon: NutritionIcon },
  { name: "workout",   title: "Workout",    Icon: WorkoutIcon   },
  { name: "progress",  title: "Progress",   Icon: ProgressIcon  },
  { name: "profile",   title: "Profile",    Icon: ProfileIcon   },
];

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: T.orange,
          tabBarInactiveTintColor: T.text2,
          tabBarStyle: {
            backgroundColor: T.surface,
            borderTopColor: T.border,
            borderTopWidth: 1,
            height: 80,
            paddingBottom: 16,
            paddingTop: 10,
          },
          tabBarLabelStyle: {
            fontSize: 9,
            fontWeight: "600",
            letterSpacing: 0.3,
          },
          tabBarInactiveBackgroundColor: T.surface,
          tabBarActiveBackgroundColor: T.surface,
        }}
      >
        {TAB_CONFIG.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarIcon: ({ focused }) => (
                <tab.Icon
                  color={focused ? T.orange : T.text2}
                  opacity={focused ? 1 : 0.35}
                />
              ),
            }}
          />
        ))}
      </Tabs>
      <AICoach />
    </View>
  );
}
