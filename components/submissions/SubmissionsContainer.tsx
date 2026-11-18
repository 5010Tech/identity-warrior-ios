import { tHelper } from "@/translations/translationHelper";
import {
  ScrollView,
  RefreshControl,
  StyleSheet,
  ViewStyle,
} from "react-native";
import PlaceholderLogo from "../PlaceholderLogo";
import { useFocusEffect, usePathname } from "expo-router";
import { useState, useRef, useCallback, useMemo } from "react";
import { useThemeColor, View } from "../themed";
import { useSubmissionActions, useSubmissionValue } from "./state";
import { SubmissionListItem } from "./SubmissionListItem";

interface SubmissionsContainerProps {
  style?: ViewStyle;
}
export const SubmissionsContainer = ({
  style = {},
}: SubmissionsContainerProps) => {
  const { resendSubmissions } = useSubmissionActions();
  const [refreshing, setRefreshing] = useState(false);

  const pathname = usePathname();

  const submissions = useSubmissionValue();

  const renderSubmissions = useMemo(
    () =>
      submissions
        .filter(({ tot }) =>
          pathname === "/faceCompare"
            ? tot === "Compare"
            : ["Verify", "Enroll", "Identify"].includes(tot),
        )
        .map((transaction, i) => (
          <SubmissionListItem key={i} {...transaction} />
        )),
    [pathname, submissions],
  );

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useFocusEffect(
    useCallback(() => {
      resendSubmissions();
      intervalRef.current = setInterval(resendSubmissions, 10000);
      return () => {
        intervalRef.current && clearInterval(intervalRef.current);
      };
    }, [resendSubmissions]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await resendSubmissions();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(resendSubmissions, 10000);
      }
    } catch (error) {
      console.error("Failed to refresh submissions:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const primaryColor = useThemeColor({}, "secondary");
  return (
    <ScrollView
      contentContainerStyle={[styles.container, style]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {renderSubmissions.length ? (
        <View style={[styles.submissions, { backgroundColor: primaryColor }]}>
          {renderSubmissions}
        </View>
      ) : (
        <PlaceholderLogo text={tHelper("noSubmissions")} />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: "100%",
  },
  submissions: {
    gap: 1,
  },
});
