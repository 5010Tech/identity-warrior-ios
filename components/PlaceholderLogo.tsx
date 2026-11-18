import { Image, StyleSheet, View } from "react-native";
import { H2 } from "./themed";

interface PlaceholderLogoProps {
  text: string;
}
export default function PlaceholderLogo({ text }: PlaceholderLogoProps) {
  return (
    <View style={styles.container}>
      <H2>{text}</H2>
      <Image
        style={styles.logo}
        source={require("@/assets/images/logo-200.png")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: "auto",
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  logo: {
    margin: 20,
    height: 150,
    width: 150,
  },
});
