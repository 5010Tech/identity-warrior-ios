import { FC } from "react";
import { Image, ImageProps } from "react-native";

export const AppLogo100: FC<ImageProps> = ({ source, ...rest }) => {
  return <Image source={require("@/assets/images/logo-100.png")} {...rest} />;
};
export const AppLogo200: FC<ImageProps> = ({ source, ...rest }) => {
  return <Image source={require("@/assets/images/logo-200.png")} {...rest} />;
};
export const AppLogo600: FC<ImageProps> = ({ source, ...rest }) => {
  return <Image source={require("@/assets/images/logo-600.png")} {...rest} />;
};
