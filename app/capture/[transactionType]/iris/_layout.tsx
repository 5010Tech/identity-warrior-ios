import React from "react";
import { Drawer } from "expo-router/drawer";
import {
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from "@react-navigation/drawer";
import { tHelper } from "@/translations/translationHelper";
import { HeaderBackButton } from "@/components/navigation";

function CustomDrawerContent(props: any) {
  return (
    <DrawerContentScrollView {...props}>
      <DrawerItemList {...props} />
      <DrawerItem
        label={tHelper("devices")}
        onPress={() => props.navigation.navigate("devices-proxy")}
      />
    </DrawerContentScrollView>
  );
}

export default function IrisLayout() {
  return (
    <Drawer
      screenOptions={{ headerShown: false }}
      drawerContent={(p) => <CustomDrawerContent {...p} />}
    >
      <Drawer.Screen
        name="index"
        options={{ drawerItemStyle: { display: "none" } }}
      />
      <Drawer.Screen
        name="capture"
        options={{ drawerItemStyle: { display: "none" } }}
      />
      <Drawer.Screen
        name="devices-proxy"
        options={{
          headerShown: true,
          title: tHelper("devices"),
          headerLeft: () => <HeaderBackButton />,
          drawerItemStyle: { display: "none" },
        }}
      />
    </Drawer>
  );
}
