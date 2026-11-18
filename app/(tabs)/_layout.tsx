import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import React from "react";
import { Text, useThemeColor } from "@/components/themed";
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
  const primaryColor = useThemeColor({}, "primary");

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: primaryColor },
        tabBarItemStyle: { paddingTop: 10 },
        tabBarLabelStyle: {
          paddingTop: 3,
          fontWeight: "600",
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
      <Tabs.Screen
        name="faceCompare"
        options={{
          title: "Face Compare",
          tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
          tabBarLabel: ({ color }) => (
            <Text
              style={{
                color,
                fontSize: 10,
                fontWeight: "600",
                textAlign: "center",
                flexWrap: "wrap",
                paddingTop: 3,
              }}
              numberOfLines={2}
            >
              Face Compare
            </Text>
          ),
        }}
      />
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
