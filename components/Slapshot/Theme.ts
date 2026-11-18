import { Dimensions, StyleSheet } from "react-native";

export const colors = {
  main: {
    colorPrimary: "#008577",
    colorPrimaryDark: "#00574B",
    colorAccent: "#D81B60",
    mainBackground: "#2c313a",
    mainAccent: "#5C91B4",
    mainForeground: "#FFFFFF",
    mainTextForeground: "#000000",
    mainButtonBackground: "#FFFFFF",
  },
  black: "#000000",
  white: "#ffffff",
};

export const noHeaderOptions = {
  headerShown: false,
};

export function containerStyles() {
  const dimensions = Dimensions.get("window");

  return StyleSheet.create({
    logo: {
      width: dimensions.width - 10,
      alignContent: "center",
    },
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 0,
    },
    rowFlex: {
      flexDirection: "row",
    },
    elementsContainer: {
      backgroundColor: colors.main.mainBackground,
      margin: 5,
    },
    statusText: {
      color: colors.white,
      textAlign: "center",
      marginTop: 50,
      fontSize: 20,
    },
    safeAreaView: {
      backgroundColor: colors.main.mainBackground,
    },
    mainView: {
      backgroundColor: colors.main.mainAccent,
    },
    progressView: {
      marginTop: 25,
      backgroundColor: colors.main.mainAccent,
      justifyContent: "center",
      alignItems: "center",
    },
  });
}

export function loadingStyles() {
  return StyleSheet.create({
    loading: {
      marginBottom: 10,
    },
  });
}
