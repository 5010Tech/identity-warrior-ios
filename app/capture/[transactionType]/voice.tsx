import { Button } from "@/components/Button";
import { SafeAreaView, Text, useThemeColor } from "@/components/themed";
import { Spinner } from "@/components/Spinner";
import {
  useCaptureActions,
  useCaptureValue,
} from "@/features/capture/context/hooks";
import { CaptureState } from "@/features/capture/types";
import { tHelper } from "@/translations/translationHelper";
import { useGoBackOnce } from "@/components/navigation/useGoBackOnce";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Linking, StyleSheet, View } from "react-native";

type ExpoAudio = typeof import("expo-audio");

// The recorder is native code. An app binary built before it was added doesn't
// have it, so load it carefully and fall back to a message instead of crashing.
let audio: ExpoAudio | null = null;
try {
  audio = require("expo-audio");
} catch (e) {
  console.warn("expo-audio is not in this build", e);
}

const clock = (millis: number) => {
  const seconds = Math.floor(millis / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;
};

/**
 * Capture Voice (DoD), like the Android app's voice_recording.xml: a timer,
 * a level meter, and Record / Stop. The sample is AAC audio, as on Android.
 */
export default function VoiceScreen() {
  return audio ? <VoiceRecorder audio={audio} /> : <VoiceUnavailable />;
}

function VoiceUnavailable() {
  const goBack = useGoBackOnce();
  const muted = useThemeColor({}, "textSecondary");
  return (
    <SafeAreaView edges={["bottom"]} style={styles.screen}>
      <View style={styles.body}>
        <MaterialCommunityIcons name="microphone-off" size={72} color={muted} />
        <Text style={[styles.hint, { color: muted }]}>
          {tHelper("voiceNotAvailable")}
        </Text>
      </View>
      <Button text={tHelper("back")} variant="secondary" onPress={goBack} />
    </SafeAreaView>
  );
}

function VoiceRecorder({ audio }: { audio: ExpoAudio }) {
  const goBack = useGoBackOnce();
  const { setValue } = useCaptureActions();
  const stored = useCaptureValue<CaptureState["voice"]>("voice");
  // A new recording is only a draft until Save; Cancel leaves the stored one alone.
  const [draft, setDraft] = useState<CaptureState["voice"]>(null);
  const saved = draft ?? stored;
  const recorder = audio.useAudioRecorder({
    ...audio.RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const state = audio.useAudioRecorderState(recorder, 100);
  const player = audio.useAudioPlayer(saved?.uri ?? null);
  const [busy, setBusy] = useState(false);
  // Stopping takes a moment (the file is finished and audio switched back to
  // playback); a progress wheel covers the gap before the Save view appears.
  const [stopping, setStopping] = useState(false);

  const strong = useThemeColor({}, "textStrong");
  const muted = useThemeColor({}, "textSecondary");
  const danger = useThemeColor({}, "danger");
  const success = useThemeColor({}, "success");
  const track = useThemeColor({}, "surfaceAlt");

  // Stop recording if the screen is left mid-recording. By the time this
  // cleanup runs the native recorder may already have been released, and
  // touching it then throws, so go by our own flag and ignore that error.
  const recordingRef = useRef(false);
  recordingRef.current = state.isRecording;
  useEffect(
    () => () => {
      if (!recordingRef.current) return;
      try {
        recorder.stop().catch(() => undefined);
      } catch {
        // Recorder already released with the screen; nothing left to stop.
      }
    },
    [recorder],
  );

  const fail = (e: unknown) =>
    Alert.alert(
      tHelper("captureVoice"),
      tHelper("failedVoice") + (e instanceof Error ? e.message : String(e)),
    );

  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const permission = await audio.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(tHelper("captureVoice"), tHelper("voiceMicDenied"), [
          { text: tHelper("openSettings"), onPress: () => Linking.openSettings() },
          { text: tHelper("cancel"), style: "cancel" },
        ]);
        return;
      }
      await audio.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    if (busy) return;
    setBusy(true);
    setStopping(true);
    try {
      const durationMillis = state.durationMillis;
      await recorder.stop();
      // Back to playback routing, so Play uses the speaker at normal volume.
      await audio.setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      if (recorder.uri) {
        setDraft({ uri: recorder.uri, durationMillis });
      }
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
      setStopping(false);
    }
  };

  const save = () => {
    if (draft) setValue("voice", draft);
    goBack();
  };

  const play = () => {
    try {
      player.seekTo(0);
      player.play();
    } catch (e) {
      fail(e);
    }
  };

  const recording = state.isRecording;
  // Metering is in decibels, roughly -60 (silence) to 0 (loudest).
  const level = recording
    ? Math.min(1, Math.max(0.03, ((state.metering ?? -60) + 60) / 60))
    : 0;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.screen}>
      <View style={styles.body}>
        <MaterialCommunityIcons
          name="microphone"
          size={84}
          color={recording ? danger : saved ? success : muted}
        />
        <Text style={[styles.timer, { color: strong }]}>
          {recording
            ? clock(state.durationMillis)
            : saved
              ? clock(saved.durationMillis)
              : "00:00"}
        </Text>
        <Text style={[styles.hint, { color: recording ? danger : muted }]}>
          {recording
            ? tHelper("voiceRecording")
            : saved
              ? tHelper(draft ? "voiceReview" : "voiceRecorded")
              : tHelper("voicePrompt")}
        </Text>
        <View style={[styles.meter, { backgroundColor: track }]}>
          <View
            style={[
              styles.meterFill,
              { width: `${Math.round(level * 100)}%`, backgroundColor: danger },
            ]}
          />
        </View>
      </View>
      <View style={styles.buttons}>
        {recording ? (
          <Button
            text={tHelper("voiceStop")}
            variant="destructive"
            icon="stop"
            onPress={stop}
            disabled={busy}
          />
        ) : saved ? (
          <>
            <Button
              text={tHelper("voiceSave")}
              icon="content-save"
              onPress={save}
            />
            <View style={styles.pair}>
              <View style={styles.half}>
                <Button
                  text={tHelper("voicePlay")}
                  variant="secondary"
                  icon="play"
                  onPress={play}
                />
              </View>
              <View style={styles.half}>
                <Button
                  text={tHelper("voiceRecordAgain")}
                  variant="secondary"
                  icon="record-circle-outline"
                  onPress={start}
                  disabled={busy}
                />
              </View>
            </View>
            <Button
              text={tHelper("cancel")}
              variant="secondary"
              onPress={goBack}
            />
          </>
        ) : (
          <>
            <Button
              text={tHelper("voiceRecord")}
              icon="record-circle-outline"
              onPress={start}
              disabled={busy}
            />
            <Button
              text={tHelper("cancel")}
              variant="secondary"
              onPress={goBack}
            />
          </>
        )}
      </View>
      {stopping && <Spinner message={tHelper("voiceFinishing")} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  timer: { fontSize: 56, fontWeight: "700", fontVariant: ["tabular-nums"] },
  hint: { fontSize: 18, textAlign: "center" },
  meter: {
    width: "80%",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 8,
  },
  meterFill: { height: "100%", borderRadius: 6 },
  buttons: { gap: 12 },
  pair: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
});
