import { Button } from "@/components/Button";
import { useSubmissionValue } from "@/components/submissions";
import { H3, Text, useThemeColor, View } from "@/components/themed";
import { formatDateNoTime } from "@/util/date";
import { format } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Fragment, PropsWithChildren } from "react";
import { Image, ScrollView, StyleSheet } from "react-native";

const clearTint = "00";
const halfTint = "20";
const fullTint = "40";

const tintValues = [clearTint, halfTint, fullTint];

const DataRow = ({
  children,
  tint = 0,
}: PropsWithChildren & { tint?: keyof typeof tintValues }) => {
  const tintColor = useThemeColor({}, "secondary");
  return (
    <View
      style={[
        styles.dataRow,
        { backgroundColor: `${tintColor}${tintValues[tint]}` },
      ]}
    >
      {children}
    </View>
  );
};

interface DataItemProps {
  label: string;
  value?: any;
  size?: number;
  alignCenter?: boolean;
}
const DataItem = ({
  label,
  value,
  alignCenter = true,
  size = 1,
}: DataItemProps) => (
  <View
    style={[
      styles.dataItem,
      { flex: size, alignItems: alignCenter ? "center" : "flex-start" },
    ]}
  >
    <Text style={styles.dataLabel}>{label}</Text>
    <Text style={styles.dataValue}>{value}</Text>
  </View>
);

export default function ViewSubmission() {
  const { tcn } = useLocalSearchParams<{ tcn: string }>();

  const {
    tot,
    ori,
    dai,
    biographicData: {
      firstName = "",
      lastName = "",
      dob = "",
      sex = "",
      race = "",
      height = null,
      weight = null,
      collectionReason = "",
    } = {},
    sensors,
    remark,
    dateTime,
  } = useSubmissionValue().find((s) => s.tcn === tcn) || {};
  const backgroundColor = useThemeColor({}, "background");
  const successColor = useThemeColor({}, "success");
  const dangerColor = useThemeColor({}, "danger");
  const inverseTextColor = useThemeColor({}, "textInverse");
  const router = useRouter();

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor }]}
      >
        <H3 style={styles.header}>Submission Details</H3>
        <DataRow tint={2}>
          <DataItem label="TCN" value={tcn as string} />
        </DataRow>
        <DataRow tint={0}>
          <DataItem label="TOT" value={tot} />
        </DataRow>
        <DataRow tint={2}>
          <DataItem label="ORI" value={ori} />
        </DataRow>
        <DataRow tint={0}>
          <DataItem label="DAI" value={dai} />
        </DataRow>
        <H3 style={styles.header}>Biographic Data</H3>
        <DataRow tint={2}>
          <DataItem label="Name" value={`${lastName}, ${firstName}`} />
        </DataRow>
        <DataRow tint={0}>
          <DataItem
            label="DOB"
            value={dob && formatDateNoTime(dob as string)}
          />
        </DataRow>
        <DataRow tint={2}>
          <DataItem label="Sex" value={sex} />
          <DataItem label="Race" value={race} />
        </DataRow>
        <DataRow tint={1}>
          <DataItem label="Height" value={height} />
          <DataItem label="Weight" value={weight} />
        </DataRow>
        <DataRow tint={2}>
          <DataItem label="Reason For Collection" value={collectionReason} />
        </DataRow>
        <DataRow tint={1}>
          <DataItem
            label="Date Submitted"
            value={dateTime && format(dateTime, "MM/dd/yyyy hh:mm bb")}
          />
        </DataRow>
        <View
          style={[
            styles.message,
            {
              backgroundColor: sensors?.length ? successColor : dangerColor,
            },
          ]}
        >
          <Text style={{ color: inverseTextColor }}>{remark}</Text>
        </View>
        {sensors?.map(
          (
            { faceImage, dateProcessed, dob, source, sex, imageType, derog },
            i,
          ) => (
            <Fragment key={i}>
              <Image
                style={styles.image}
                resizeMode="cover"
                src={`data:image/png;base64,${faceImage}`}
              />
              <H3 style={styles.header}>Details</H3>
              <DataRow tint={2}>
                <DataItem
                  label="Date Processed"
                  value={
                    dateProcessed &&
                    format(dateProcessed, "MM/dd/yyyy hh:mm bb")
                  }
                />
              </DataRow>
              <DataRow tint={1}>
                <DataItem label="File Data Source" value={source} />
              </DataRow>
              <DataRow tint={2}>
                <DataItem
                  label="Date of Birth"
                  value={dob && formatDateNoTime(dob.slice(0, 10))}
                />
              </DataRow>
              <DataRow tint={1}>
                <DataItem label="Sex" value={sex} />
              </DataRow>
              <DataRow tint={2}>
                <DataItem label="Image Type" value={imageType} />
              </DataRow>
              <DataRow tint={1}>
                <DataItem label="Rap Sheet" value={derog} alignCenter={false} />
              </DataRow>
            </Fragment>
          ),
        )}
      </ScrollView>
      <View style={styles.closeContainer}>
        <Button text="Close" onPress={router.back} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dataRow: {
    flexDirection: "row",
    padding: 10,
    gap: 20,
  },
  dataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    backgroundColor: "#00000000",
  },
  dataLabel: {
    fontWeight: 600,
  },
  dataValue: {
    flex: 1,
  },
  container: {
    minHeight: "100%",
  },
  header: {
    marginTop: 25,
    marginBottom: 5,
    marginLeft: 10,
  },
  message: {
    marginVertical: 10,
    padding: 10,
  },
  image: {
    marginVertical: 10,
    width: "100%",
    height: undefined,
    aspectRatio: 1,
  },
  close: {
    marginBottom: 30,
    maxWidth: "50%",
  },
  closeContainer: {
    paddingBottom: 30,
    paddingTop: 15,
    paddingHorizontal: 30,
  },
});
