import { useThemeColor } from "@/components/themed";
import { tHelper } from "@/translations/translationHelper";
import { AmputatedOrBandaged } from "@/types";
import { Fragment, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Dialog from "react-native-dialog";
import { Switch } from "react-native-gesture-handler";
import { CaptureSequence } from "./types";
import { fgpFromMultiple } from "./util";

interface OmitFingerDialogProps {
  visible: boolean;
  captureSequence: CaptureSequence;
  toggle: () => void;
  onSubmit: (omittedFingers: AmputatedOrBandaged[]) => void;
}

export const OmitFingerDialog = ({
  visible,
  captureSequence,
  toggle,
  onSubmit,
}: OmitFingerDialogProps) => {
  const [omissions, setOmissions] = useState<(AmputatedOrBandaged | null)[]>(
    [],
  );

  useEffect(() => {
    setOmissions(Array(fgpFromMultiple[captureSequence].length).fill(null));
  }, [captureSequence]);

  const handleOmission =
    (AmputattedOrBandaged: AmputatedOrBandaged, i: number) => () => {
      setOmissions((prev) =>
        prev.toSpliced(
          i,
          1,
          prev[i]?.reason === AmputattedOrBandaged.reason
            ? null
            : AmputattedOrBandaged,
        ),
      );
    };
  const handleSubmit = () => {
    onSubmit(omissions.filter((omitted) => omitted !== null));
    toggle();
  };

  const primary = useThemeColor({}, "primary");
  return (
    <Dialog.Container verticalButtons visible={visible}>
      <Dialog.Title>{tHelper("omitFinger")}</Dialog.Title>
      <Dialog.Description>{tHelper("omitReason")}</Dialog.Description>
      {fgpFromMultiple[captureSequence].map((fgp, i) => (
        <Fragment key={i}>
          <Dialog.Description style={styles.fingerLabel} key={i}>
            {tHelper(fgp.toString())}
          </Dialog.Description>
          <View style={styles.switchesContainer}>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>{tHelper("amputated")}</Text>
              <Switch
                value={omissions[i]?.reason === "XX"}
                onChange={handleOmission(
                  { reason: "XX", fingerPosition: fgp },
                  i,
                )}
                trackColor={{ true: primary }}
              />
            </View>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>{tHelper("bandaged")}</Text>
              <Switch
                value={omissions[i]?.reason === "UP"}
                onChange={handleOmission(
                  { reason: "UP", fingerPosition: fgp },
                  i,
                )}
                trackColor={{ true: primary }}
              />
            </View>
          </View>
        </Fragment>
      ))}
      <Dialog.Button label={tHelper("cancel")} onPress={toggle} />
      <Dialog.Button
        label={tHelper("omitFingers")}
        onPress={handleSubmit}
        bold
      />
    </Dialog.Container>
  );
};

const styles = StyleSheet.create({
  switchContainer: {
    gap: 5,
  },
  switchesContainer: {
    paddingBottom: 10,
    paddingTop: 5,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-evenly",
  },
  switchLabel: {
    fontSize: 13,
  },
  fingerLabel: {
    fontWeight: 600,
  },
});
