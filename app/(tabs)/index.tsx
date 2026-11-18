import { useActiveDevice } from "@/components/device/activeDevice";
import { AppLogo200 } from "@/components/AppLogo";
import { H1, H3, SafeAreaView } from "@/components/themed";
import { Link } from "expo-router";
import {  StyleSheet, View } from "react-native";
import { tHelper } from "@/translations/translationHelper";
import { TransactionLink } from "@/features/capture/TransactionLink";

export default function HomeScreen() {
  const { activeDevice } = useActiveDevice();

  return (
    <SafeAreaView style={styles.container}>
      <H1>{tHelper("appName")}</H1>
      <Link href="/devices">
        <H3>
          {activeDevice
            ? `${activeDevice.modelNumber} - ${activeDevice.serialNumber}`
            : tHelper("connectDevice")}
        </H3>
      </Link>
      <AppLogo200 />
      <View style={styles.buttonContainer}>
        <TransactionLink
          transactionType="Verify"
          label={tHelper("verifyRequest")}
        />
        <TransactionLink
          transactionType="Identify"
          label={tHelper("identifyRequest")}
        />
        <TransactionLink
          transactionType="Enroll"
          label={tHelper("enrollRequest")}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "space-evenly",
    height: "100%",
  },
  buttonContainer: {
    gap: 20,
    width: 250,
  },
});
