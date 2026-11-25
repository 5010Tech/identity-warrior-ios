import { Button } from "@/components/Button";
import { Text, useThemeColor } from "@/components/themed";
import { tHelper } from "@/translations/translationHelper";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { EbtsFields, readSubmissionFields } from "./readEbts";
import { deliveryOf } from "./sendSubmission";
import { DodSubmission } from "./vault";

/** A form label without its required mark. */
const label = (key: Parameters<typeof tHelper>[0]) =>
  tHelper(key).replace(/\s*\*$/, "");

const item = (fields: EbtsFields, tag: string, subfield = 0, index = 0) =>
  (fields.get(tag)?.[subfield]?.[index] ?? "").trim();

/** 19900131 as 1990-01-31; anything else as it is. */
const date = (value: string) =>
  /^\d{8}$/.test(value)
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`
    : value;

const formatDate = (iso: string) => {
  const when = new Date(iso);
  return Number.isNaN(when.getTime()) ? "" : when.toLocaleString();
};

/** What the transaction says about itself and its subject, label by value. */
const rowsFor = (
  submission: DodSubmission,
  fields?: EbtsFields,
): [string, string][] => {
  const rows: [string, string][] = [
    [tHelper("submissionTcn"), submission.tcn],
    [tHelper("submissionType"), submission.tot],
    [tHelper("submissionCreated"), formatDate(submission.createdAt)],
  ];
  if (fields) {
    const name = (fields.get("2.8040")?.[0] ?? [])
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ");
    rows.push(
      [label("t1Dai"), item(fields, "1.7")],
      [label("t1Ori"), item(fields, "1.8")],
      [label("sectionType2Name"), name],
      [label("sex"), item(fields, "2.24")],
      [label("t2BirthDate"), date(item(fields, "2.8003"))],
      [label("citizenship"), item(fields, "2.8007")],
      [label("birthCountry"), item(fields, "2.8033", 0, 2)],
      [label("height"), item(fields, "2.8035")],
      [label("weight"), item(fields, "2.8036")],
      [label("hairColor"), item(fields, "2.32")],
      [label("eyeColor"), item(fields, "2.8037", 0, 1)],
      [label("personnelType"), item(fields, "2.310")],
      [label("internment"), item(fields, "2.302")],
      [label("reason"), item(fields, "2.8103")],
      [label("arrestDate"), date(item(fields, "2.45"))],
      [label("arrestOffense"), item(fields, "2.47", 0, 1)],
      [label("dnaId"), item(fields, "2.8606", 0, 1)],
      // A latent transaction's own fields.
      [label("attentionIndicator"), item(fields, "2.6")],
      [label("latentCaseIdPre"), item(fields, "2.10")],
      [label("latentCaseId"), item(fields, "2.10", 0, 1)],
    );
  }
  return rows.filter(([, value]) => !!value);
};

/**
 * The pop-up for a Submissions card: the frontal face, where the submission
 * stands (with the reason in full if it failed), and the transaction's own
 * and biographic data, read from the stored (encrypted) file while it is open.
 */
export function SubmissionDetails({
  submission,
  onClose,
  onResubmit,
}: {
  submission: DodSubmission | null;
  onClose: () => void;
  onResubmit: (submission: DodSubmission) => void;
}) {
  const surface = useThemeColor({}, "surface");
  const surfaceAlt = useThemeColor({}, "surfaceAlt");
  const stroke = useThemeColor({}, "stroke");
  const strong = useThemeColor({}, "textStrong");
  const muted = useThemeColor({}, "textSecondary");
  const danger = useThemeColor({}, "danger");
  const success = useThemeColor({}, "success");

  const tcn = submission?.tcn;
  const [fields, setFields] = useState<EbtsFields>();
  const [loading, setLoading] = useState(false);
  const [unreadable, setUnreadable] = useState(false);
  useEffect(() => {
    setFields(undefined);
    setUnreadable(false);
    if (!tcn) return;
    let live = true;
    setLoading(true);
    readSubmissionFields(tcn)
      .then((read) => live && setFields(read))
      .catch(() => live && setUnreadable(true))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [tcn]);

  if (!submission) return null;
  const delivery = deliveryOf(submission);
  const failed = delivery?.tone === "bad";
  const canResubmit = !delivery?.delivered;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        {/* Behind the dialog: a press outside it closes it. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel={tHelper("close")}
        />
        <View
          style={[styles.dialog, { backgroundColor: surface, borderColor: stroke }]}
        >
          <ScrollView contentContainerStyle={styles.content}>
            <View style={[styles.photo, { backgroundColor: surfaceAlt }]}>
              {submission.thumbnail ? (
                <Image
                  resizeMode="cover"
                  style={styles.photoImage}
                  source={{
                    uri: `data:image/jpeg;base64,${submission.thumbnail}`,
                  }}
                />
              ) : (
                <MaterialCommunityIcons name="account" size={120} color={muted} />
              )}
            </View>
            <Text style={[styles.name, { color: strong }]}>
              {submission.name}
            </Text>

            <Text
              style={[
                styles.status,
                {
                  color: failed
                    ? danger
                    : !delivery || delivery.tone === "pending"
                      ? muted
                      : success,
                },
              ]}
            >
              {tHelper(delivery ? delivery.label : "submissionNotSent")}
            </Text>
            {failed && !!delivery?.error && (
              <View style={[styles.errorBox, { borderColor: danger }]}>
                <Text style={[styles.errorTitle, { color: danger }]}>
                  {tHelper("submissionErr")}
                </Text>
                {/* In full, and selectable so it can be copied. */}
                <Text selectable style={[styles.errorText, { color: strong }]}>
                  {delivery.error}
                </Text>
              </View>
            )}

            {rowsFor(submission, fields).map(([name, value]) => (
              <View
                key={name}
                style={[styles.row, { borderTopColor: stroke }]}
              >
                <Text style={[styles.rowLabel, { color: muted }]}>{name}</Text>
                <Text selectable style={[styles.rowValue, { color: strong }]}>
                  {value}
                </Text>
              </View>
            ))}
            {loading && <ActivityIndicator color={muted} />}
            {unreadable && (
              <Text style={[styles.rowLabel, { color: danger }]}>
                {tHelper("submissionUnreadable")}
              </Text>
            )}
          </ScrollView>
          <View style={styles.buttons}>
            {canResubmit && (
              <Button
                variant="secondary"
                icon="send"
                text={tHelper("resubmit")}
                style={styles.button}
                onPress={() => onResubmit(submission)}
              />
            )}
            <Button
              text={tHelper("close")}
              style={styles.button}
              onPress={onClose}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: "center",
    padding: 18,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  dialog: {
    maxHeight: "88%",
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  content: { gap: 10, padding: 16 },
  photo: {
    alignSelf: "center",
    width: 200,
    height: 240,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  photoImage: { width: "100%", height: "100%" },
  name: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  status: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  errorBox: { gap: 4, padding: 10, borderWidth: 1, borderRadius: 10 },
  errorTitle: { fontSize: 14, fontWeight: "700" },
  errorText: { fontSize: 15 },
  row: { gap: 2, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 16, fontWeight: "600" },
  buttons: { flexDirection: "row", gap: 10, padding: 12 },
  button: { flex: 1 },
});
