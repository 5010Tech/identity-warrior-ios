// app/finger-capture/_layout.tsx
import React, { useState } from "react";
import { Drawer } from "expo-router/drawer";
import {
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { tHelper } from "@/translations/translationHelper";
import { HeaderBackButton } from "@/components/navigation";
import SetCaptureSequenceDialog from "@/features/capture/SetCaptureSequenceDialog";

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <DrawerContentScrollView {...props}>
      <DrawerItemList {...props} />
      <DrawerItem
        label={tHelper("setCaptureSequence")}
        onPress={() => setIsDialogOpen(true)}
      />
      <SetCaptureSequenceDialog
        isOpen={isDialogOpen}
        setOpen={setIsDialogOpen}
        onSequenceChange={() => props.navigation.goBack()}
      />
    </DrawerContentScrollView>
  );
}

export default function FingerCaptureLayout() {
  return (
    <>
      <Drawer
        screenOptions={{ headerShown: false }}
        drawerContent={(p) => <CustomDrawerContent {...p} />}
      >
        <Drawer.Screen
          name="index"
          options={{
            drawerItemStyle: { display: "none" },
          }}
        />
        <Drawer.Screen
          name="device"
          options={{ drawerItemStyle: { display: "none" } }}
        />
        <Drawer.Screen
          name="devices-proxy"
          options={{
            headerShown: true,
            title: tHelper("devices"),
            headerLeft: () => <HeaderBackButton />,
          }}
        />
      </Drawer>
    </>
  );
}
