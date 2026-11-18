import { SafeAreaView } from "@/components/themed";
import { themeColors } from "@/constants/style/Colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { tHelper } from "@/translations/translationHelper";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={[StyleSheet.absoluteFill, styles.container]}>
      <TouchableOpacity
        style={styles.settingsCard}
        onPress={() => {
          router.navigate({ pathname: "/settings/submissionSettings" });
        }}
      >
        <View style={styles.icons}>
          <Ionicons
            name="server-outline"
            size={100}
            color={themeColors.blue}
          />
          <Ionicons
            name="settings-outline"
            size={100}
            color={themeColors.blue}
          />
        </View>
        <Text style={styles.title}>{tHelper("submissionSettings")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.settingsCard}
        onPress={() => {
          router.navigate({ pathname: "/settings/appSettings" });
        }}
      >
        <View style={styles.icons}>
          <Ionicons
            name="phone-portrait-outline"
            size={100}
            color={themeColors.blue}
          />
          <Ionicons
            name="settings-outline"
            size={100}
            color={themeColors.blue}
          />
        </View>
        <Text style={styles.title}>{tHelper("appSettings")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.settingsCard}
        onPress={() => {
          router.navigate({ pathname: "/settings/autofillSettings" });
        }}
      >
        <View style={styles.icons}>
          <Ionicons name="color-wand" size={100} color={themeColors.blue} />
          <Ionicons
            name="settings-outline"
            size={100}
            color={themeColors.blue}
          />
        </View>
        <Text style={styles.title}>{tHelper("autofillSettings")}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  settingsCard: {
    backgroundColor: "#fff",
    borderRadius: 30,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: "70%",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
    borderColor: themeColors.blue,
    borderWidth: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: themeColors.blue,
  },
  container: {
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  icons: {
    flexDirection: "row",
  },
});
