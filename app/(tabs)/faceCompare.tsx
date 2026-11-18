import { StyleSheet } from "react-native";
import { Button } from "@/components/Button";
import { SubmissionsContainer } from "@/components/submissions";
import { SafeAreaView, View } from "@/components/themed";
import { Link } from "expo-router";

export default function FaceCompareScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <SubmissionsContainer />
      <View style={styles.buttonContainer}>
        <Link asChild href="/faceCompare/new">
          <Button text="New Face Compare" />
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { height: "100%" },
  buttonContainer: { padding: 10, width: "100%" },
});
