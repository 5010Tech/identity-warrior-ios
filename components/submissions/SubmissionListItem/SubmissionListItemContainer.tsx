import { Text, useThemeColor, View } from "@/components/themed";
import { FontAwesome } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSubmissionActions } from "../state";
import { SubmissionItem } from "../types";
import { CaptureSubmissionData } from "./CaptureSubmissionData";
import { CompareSubmissionData } from "./CompareSubmissionData";

const SubmissionListItemContainer = (props: SubmissionItem) => {
  const { tcn, fetching, pending, transactionDate, tot } = props;

  const { deleteSubmission } = useSubmissionActions();

  const [isSwiping, setIsSwiping] = useState(false);

  const [now, setNow] = useState(Date.now());

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (pending) {
      intervalRef.current = setInterval(() => {
        setNow(Date.now());
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      intervalRef.current && clearInterval(intervalRef.current);
    };
  }, [pending]);

  const elapsedTime = useMemo(() => {
    if (!transactionDate) return "00:00:00";

    const elapsedSeconds = Math.max(
      0,
      Math.floor((now - new Date(transactionDate).getTime()) / 1000),
    );
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    const leadingZero = (n: number) => (n < 10 ? `0${n}` : `${n}`);

    return `${leadingZero(hours)}:${leadingZero(minutes)}:${leadingZero(seconds)}`;
  }, [transactionDate, now]);

  const primaryColor = useThemeColor({}, "primary");
  const dangerColor = useThemeColor({}, "danger");

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onSwipeStart = () => {
    timeoutRef.current && clearTimeout(timeoutRef.current);
    setIsSwiping(true);
  };
  const onSwipeEnd = () => setTimeout(() => setIsSwiping(false), 50);
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = () => {
    const handlePress = () => {
      Alert.alert(
        "Delete Submission",
        "Are you sure you want to delete this submission?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              deleteSubmission(tcn);
              swipeableRef.current?.close();
            },
          },
        ],
      );
    };
    return (
      <View>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: dangerColor }]}
          onPress={handlePress}
        >
          <FontAwesome size={24} color={"#FFF"} name="trash" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable
      overshootFriction={5}
      renderRightActions={renderRightActions}
      onSwipeableClose={onSwipeEnd}
      onSwipeableOpenStartDrag={onSwipeStart}
      onSwipeableCloseStartDrag={onSwipeStart}
      ref={swipeableRef}
    >
      {fetching ? (
        <View style={[styles.spinner, { borderColor: primaryColor }]}>
          <ActivityIndicator color={primaryColor} size={"large"} />
        </View>
      ) : tot === "Compare" ? (
        <CompareSubmissionData elapsedTime={elapsedTime} {...props} />
      ) : (
        <CaptureSubmissionData
          elapsedTime={elapsedTime}
          isSwiping={isSwiping}
          {...props}
        />
      )}
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  spinner: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  actionText: {
    color: "#FFF",
  },
  actionButton: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
});

export default SubmissionListItemContainer;
