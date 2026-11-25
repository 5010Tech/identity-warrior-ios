import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import React from "react";
import { useThemeColor } from "@/components/themed";
import { tHelper } from "@/translations/translationHelper";

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const iconSelectedColor = useThemeColor({}, "tabIconSelected");
  const iconColor = useThemeColor({}, "tabIconDefault");
  const tabBarColor = useThemeColor({}, "tabBar");
  const borderColor = useThemeColor({}, "stroke");

  // Bottom navigation like the Android app: plain bar (window background) with a
  // dark selected item and gray unselected items, always labeled.
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: tabBarColor,
          borderTopColor: borderColor,
        },
        tabBarItemStyle: { paddingTop: 6 },
        tabBarLabelStyle: {
          paddingTop: 2,
          fontSize: 12,
          fontWeight: "700",
        },
        tabBarActiveTintColor: iconSelectedColor,
        tabBarInactiveTintColor: iconColor,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: tHelper("capture"),
          tabBarIcon: ({ color }) => <TabBarIcon name="camera" color={color} />,
        }}
      />
      <Tabs.Screen
        name="submissions"
        options={{
          title: tHelper("submissions"),
          tabBarIcon: ({ color }) => <TabBarIcon name="send" color={color} />,
        }}
      />
      {/* Face Compare is hidden from the tab bar for now; the screen and its
          routes (app/faceCompare/*) remain in the app. */}
      <Tabs.Screen name="faceCompare" options={{ href: null }} />
      <Tabs.Screen
        name="settings"
        options={{
          title: tHelper("settings"),
          tabBarIcon: ({ color }) => <TabBarIcon name="gear" color={color} />,
        }}
      />
    </Tabs>
  );
}
