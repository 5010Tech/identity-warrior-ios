import { Button, IconName } from "@/components/Button";
import { TransactionType } from "@/types";
import { Link } from "expo-router";
import { forwardRef } from "react";
import { PressableProps, View } from "react-native";

interface CaptureHomeButtonProps extends Omit<PressableProps, "style"> {
  text: string;
  icon?: IconName;
  height?: number;
}

/**
 * A Capture-screen button. At 50pt it matches the Android app; taller buttons
 * (when the screen has room) get proportionally larger text and icon.
 */
export const CaptureHomeButton = forwardRef<View, CaptureHomeButtonProps>(
  ({ text, icon, height = 50, ...rest }, ref) => {
    const scale = height / 50;
    return (
      <Button
        ref={ref}
        text={text}
        variant="capture"
        icon={icon}
        iconSize={Math.round(24 * scale)}
        style={{ height }}
        textStyle={{ fontSize: Math.round(18 * scale) }}
        {...rest}
      />
    );
  },
);
CaptureHomeButton.displayName = "CaptureHomeButton";

interface TransactionLinkProps {
  transactionType: TransactionType;
  label: string;
  icon?: IconName;
  /** Button outline height; text and icon scale with it. 50 when unset. */
  height?: number;
}

/** A large outlined Capture-screen button that starts a transaction. */
export const TransactionLink = ({
  transactionType,
  label,
  icon,
  height = 50,
}: TransactionLinkProps) => (
  <Link
    href={{
      pathname: "/capture/[transactionType]",
      params: { transactionType },
    }}
    asChild
  >
    <CaptureHomeButton text={label} icon={icon} height={height} />
  </Link>
);
