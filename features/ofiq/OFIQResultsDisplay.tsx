import React, { useRef, useState } from "react";
import { StyleSheet, Image, View as DefaultView } from "react-native";
import { EyesOpen, HeadSize, InterEyeDistance } from "./OFIQCalculator";
import { Text, useThemeColor, View } from "@/components/themed";
import { FontAwesome } from "@expo/vector-icons";
import { tHelper } from "@/translations/translationHelper";
import Popover, { PopoverPlacement } from "react-native-popover-view";
import { TouchableOpacity } from "react-native-gesture-handler";

function Label({
  label,
  description,
  image,
}: {
  label: string;
  description: string;
  image?: boolean;
}) {
  const [displayDesc, setDisplayDesc] = useState(false);
  const sourceRef = useRef<DefaultView>(null);
  const infoColor = useThemeColor({}, "textStrong");
  const bodyColor = useThemeColor({}, "text");
  const cardColor = useThemeColor({}, "surface");
  const strokeColor = useThemeColor({}, "strokeStrong");
  const dividerColor = useThemeColor({}, "divider");
  return (
    <View>
      <View style={styles.valueRow}>
        <Text style={styles.labelText}>{label}</Text>
        <TouchableOpacity onPress={setDisplayDesc.bind(null, true)}>
          <DefaultView ref={sourceRef}>
            {/* Text color, so it shows in dark mode too (it used to be black). */}
            <FontAwesome
              style={styles.infoIcon}
              name="info-circle"
              size={30}
              color={infoColor}
            />
          </DefaultView>
        </TouchableOpacity>
        <Popover
          isVisible={displayDesc}
          onRequestClose={setDisplayDesc.bind(null, false)}
          placement={PopoverPlacement.AUTO}
          from={sourceRef}
          arrowSize={{ width: 18, height: 10 }}
          backgroundStyle={styles.popoverBackdrop}
          popoverStyle={[
            styles.popover,
            { backgroundColor: cardColor, borderColor: strokeColor },
          ]}
        >
          {/* A titled card: the measure's name, a divider, then what it means. */}
          <DefaultView style={styles.popoverBody}>
            <DefaultView style={styles.popoverHeader}>
              <FontAwesome name="info-circle" size={20} color={infoColor} />
              <Text style={[styles.popoverTitle, { color: infoColor }]}>
                {label}
              </Text>
            </DefaultView>
            <DefaultView
              style={[styles.popoverDivider, { backgroundColor: dividerColor }]}
            />
            <Text style={[styles.popoverText, { color: bodyColor }]}>
              {description}
            </Text>
            {image && (
              <DefaultView style={styles.popoverImageFrame}>
                <Image
                  style={styles.image}
                  source={require("@/assets/images/face_pose.png")}
                />
              </DefaultView>
            )}
            <TouchableOpacity
              onPress={setDisplayDesc.bind(null, false)}
              style={[styles.popoverClose, { borderColor: strokeColor }]}
            >
              <Text style={[styles.popoverCloseText, { color: infoColor }]}>
                {tHelper("close")}
              </Text>
            </TouchableOpacity>
          </DefaultView>
        </Popover>
      </View>
    </View>
  );
}

function Result({
  value,
  passed,
  meets,
}: {
  value: number;
  passed: boolean;
  meets: boolean;
}) {
  const warningColor = useThemeColor({}, "warning");
  const successColor = useThemeColor({}, "success");
  const dangerColor = useThemeColor({}, "danger");
  if (passed) {
    return (
      <View style={styles.valueRow}>
        <Text style={styles.valueText}>{value}</Text>
        <Text style={[styles.valueLabel, { color: successColor }]}>
          ({tHelper("passed")})
        </Text>
      </View>
    );
  } else if (meets) {
    return (
      <View style={styles.valueRow}>
        <Text style={styles.valueText}>{value}</Text>
        <Text style={[styles.valueLabel, { color: warningColor }]}>
          ({tHelper("meets")})
        </Text>
      </View>
    );
  } else {
    return (
      <View style={styles.valueRow}>
        <Text style={styles.valueText}>{value}</Text>
        <Text style={[styles.valueLabel, { color: dangerColor }]}>
          ({tHelper("failed")})
        </Text>
      </View>
    );
  }
}

const OFIQResultsDisplay = ({
  interEyeDistance,
  headSize,
  eyesOpen,
  score,
  passed,
  meets,
}: {
  interEyeDistance: InterEyeDistance;
  headSize: HeadSize;
  eyesOpen: EyesOpen;
  score: number;
  passed: boolean;
  meets: boolean;
}) => {
  return (
    <View style={styles.topView}>
      <Text style={styles.labelText}>Overall Face Score:</Text>
      <View style={styles.valueRow}>
        <Result value={score} passed={passed} meets={meets} />
      </View>
      <Label
        label={tHelper("ied")}
        description={interEyeDistance.interEyeDistanceDescription}
      />
      <View style={styles.valueRow}>
        <Result
          value={interEyeDistance.interEyeDistance}
          passed={interEyeDistance.meetsInterEyeDistanceBestPractice}
          meets={interEyeDistance.meetsInterEyeDistanceRequirement}
        />
      </View>
      <Label
        label={tHelper("faceMidHor")}
        description={headSize.faceMidPointHorizontalPositionDescription}
      />
      <View style={styles.valueRow}>
        <Result
          value={Number(headSize.faceMidPointHorizontalPosition.toFixed(5))}
          passed={headSize.meetsFaceMidPointHorizontalPositionRequirement}
          meets={false}
        />
      </View>
      <Label
        label={tHelper("faceMidVer")}
        description={headSize.faceMidPointVerticalPositionDescription}
      />
      <View style={styles.valueRow}>
        <Result
          value={Number(headSize.faceMidPointVerticalPosition.toFixed(5))}
          passed={headSize.meetsFaceMidPointVerticalPositionRequirement}
          meets={false}
        />
      </View>
      <Label
        label={tHelper("headWidth")}
        description={headSize.headWidthRatioDescription}
      />
      <View style={styles.valueRow}>
        <Result
          value={Number(headSize.headWidthRatio.toFixed(5))}
          passed={headSize.meetsHeadWidthRatioRequirement}
          meets={false}
        />
      </View>
      <Label
        label={tHelper("headHeight")}
        description={headSize.headHeightRatioDescription}
      />
      <View style={styles.valueRow}>
        <Result
          value={Number(headSize.headHeightRatio.toFixed(5))}
          passed={headSize.meetsHeadHeightRatioRequirement}
          meets={false}
        />
      </View>
      <Label
        label={tHelper("roll")}
        description={headSize.rollDescription}
        image={true}
      />
      <View style={styles.valueRow}>
        <Result
          value={Number(headSize.roll.toFixed(5))}
          passed={headSize.meetsRollBestPractice}
          meets={headSize.meetsRollRequirement}
        />
      </View>
      <Label
        label={tHelper("pitch")}
        description={headSize.pitchDescription}
        image={true}
      />
      <View style={styles.valueRow}>
        <Result
          value={Number(headSize.pitch.toFixed(5))}
          passed={headSize.meetsPitchBestPractice}
          meets={headSize.meetsPitchRequirement}
        />
      </View>
      <Label
        label={tHelper("yaw")}
        description={headSize.yawDescription}
        image={true}
      />
      <View style={styles.valueRow}>
        <Result
          value={Number(headSize.yaw.toFixed(5))}
          passed={headSize.meetsYawRequirement}
          meets={false}
        />
      </View>
      <Label
        label={tHelper("leftEyeProb")}
        description={eyesOpen.leftEyeOpenProbabilityDescription}
      />
      <View style={styles.valueRow}>
        <Result
          value={Number(eyesOpen.leftEyeOpenProbability.toFixed(5))}
          passed={eyesOpen.leftEyeOpen}
          meets={false}
        />
      </View>
      <Label
        label={tHelper("rightEyeProb")}
        description={eyesOpen.rightEyeOpenProbabilityDescription}
      />
      <View style={styles.valueRow}>
        <Result
          value={Number(eyesOpen.rightEyeOpenProbability.toFixed(5))}
          passed={eyesOpen.rightEyeOpen}
          meets={false}
        />
      </View>
    </View>
  );
};

export default OFIQResultsDisplay;

const styles = StyleSheet.create({
  topView: {
    paddingLeft: 5,
    paddingBottom: 30,
  },
  labelText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  valueText: {
    fontSize: 20,
  },
  valueLabel: {
    fontSize: 20,
    paddingLeft: 10,
    fontWeight: "bold",
  },
  valueRow: {
    flexDirection: "row",
    paddingBottom: 5,
  },
  valueColumn: {
    flexDirection: "column",
  },
  infoIcon: {
    alignSelf: "center",
    paddingLeft: 15,
  },
  descText: {
    fontSize: 30,
  },
  image: {
    aspectRatio: 1,
    width: "100%",
    objectFit: "contain",
  },
  popoverBackdrop: { backgroundColor: "#00000099" },
  popover: {
    borderRadius: 16,
    borderWidth: 1,
    width: 300,
  },
  popoverBody: { padding: 16, gap: 12 },
  popoverHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  popoverTitle: { flex: 1, fontSize: 18, fontWeight: "700" },
  popoverDivider: { height: 1 },
  popoverText: { fontSize: 16, lineHeight: 23 },
  // The pose diagram is drawn on white, so it gets a white frame of its own.
  popoverImageFrame: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 8,
  },
  popoverClose: {
    alignSelf: "flex-end",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  popoverCloseText: { fontSize: 15, fontWeight: "700" },
});
