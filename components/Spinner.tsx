import { ActivityIndicator, StyleSheet } from "react-native";
import { Text, View } from "./themed";

interface SpinnerProps {
  message?: string;
}

export const Spinner = ({ message }: SpinnerProps) => (
  <View darkColor="#00000075" lightColor="#00000075" style={styles.container}>
    <ActivityIndicator color="#ffffff" size="large" />
    {message && <Text style={styles.text}>{message}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    zIndex: 1000000,
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    textAlign: "center",
    color: "#FFF",
  },
});
