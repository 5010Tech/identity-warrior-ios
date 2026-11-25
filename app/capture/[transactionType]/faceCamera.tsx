import { logEvent } from "@/util/fieldLog";
import { useAutofillSelector } from "@/components/autofill/context/useAutofillSelector";
import { Button } from "@/components/Button";
import {
  useCaptureActions,
  useCaptureValue,
} from "@/features/capture/context/hooks";
import {
  buildFaceDTO,
  checkPreview,
  CroppedFace,
  cropToFace,
} from "@/features/capture/faceCamera";
import { tHelper, translationKey } from "@/translations/translationHelper";
import { FaceDTO, Pose } from "@/types";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useIsFocused } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { saveBase64Image } from "@/util/fs";
import { EncodingType } from "expo-file-system/legacy";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import type { Camera as CameraRef } from "react-native-vision-camera";

type VisionCamera = typeof import("react-native-vision-camera");

// The camera library is loaded the first time this screen opens, not when the
// app starts, so a problem inside it can never hold up app launch.
let visionCamera: VisionCamera | null | undefined;
const loadVisionCamera = (): VisionCamera | null => {
  if (visionCamera === undefined) {
    try {
      visionCamera = require("react-native-vision-camera");
    } catch (e) {
      console.error("react-native-vision-camera could not be loaded", e);
      visionCamera = null;
    }
  }
  return visionCamera ?? null;
};

/** How long the face must stay good before the automatic capture. */
const AUTO_CAPTURE_HOLD_MS = 1500;
const GREEN = "#4CAF50";
const SHADE = "rgba(128,128,128,0.73)";

type FlashMode = "auto" | "on" | "off";
const FLASH_ICONS = {
  auto: "flash-auto",
  on: "flash",
  off: "flash-off",
} as const;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Face capture without Slapshot, modeled on the Android BDSP build's
 * FaceCaptureActivity: a live camera with a circular guide, a status pill
 * telling the subject what to do, automatic capture once the face has been
 * held in place (with a green ring sweeping round), a manual shutter, flash
 * and camera-flip buttons, then a review with Recapture / Save Image.
 */
export default function FaceCameraScreen() {
  const vc = loadVisionCamera();
  const router = useRouter();
  if (!vc) {
    return (
      <View style={styles.processing}>
        <Text style={styles.processingText}>{tHelper("faceNoCamera")}</Text>
        <Button text={tHelper("back")} variant="secondary" onPress={router.back} />
      </View>
    );
  }
  return <FaceCamera vc={vc} />;
}

function FaceCamera({ vc }: { vc: VisionCamera }) {
  const { Camera, useCameraDevice, useCameraFormat, useCameraPermission } = vc;
  const router = useRouter();
  const { pose = "F" } = useLocalSearchParams<{ pose?: Pose }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const focused = useIsFocused();

  const faces = useCaptureValue<FaceDTO[]>("transaction.faces") ?? [];
  const { setValue } = useCaptureActions();
  const facesRef = useRef(faces);
  facesRef.current = faces;

  const { hasPermission, requestPermission } = useCameraPermission();
  // Selfie Mode (App Settings) opens on the front camera; the flip button
  // still switches for this capture.
  const selfieMode = useAutofillSelector((s) => !!s.appSettings?.selfieMode);
  const [facing, setFacing] = useState<"back" | "front">(
    selfieMode ? "front" : "back",
  );
  const device = useCameraDevice(facing);
  // Ask for the camera's largest photo size. Left to its default the camera
  // can hand back a much smaller picture, and the face cropped out of that
  // ends up soft and low on detail.
  // A sharp preview first (the preview is the video stream, and the format
  // with the largest photos can come with a very coarse one, as on the front
  // camera), then the largest photo that format offers.
  const format = useCameraFormat(device, [
    { videoResolution: { width: 1920, height: 1080 } },
    { photoResolution: "max" },
  ]);
  const camera = useRef<CameraRef>(null);

  const [status, setStatus] = useState<translationKey>("faceSearching");
  const [faceOk, setFaceOk] = useState(false);
  const [flash, setFlash] = useState<FlashMode>("auto");
  const [processing, setProcessing] = useState(false);
  // The captured face, already saved to the collection, shown for review.
  const [review, setReview] = useState<FaceDTO | null>(null);

  // True from the moment a photo is being taken until review is dismissed.
  const capturing = useRef(false);
  // True while the ring is sweeping towards an automatic capture.
  const holding = useRef(false);
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  // Guide circle, as on Android: 45% of the shorter side, centered.
  const radius = Math.min(width, height) * 0.45;
  const cx = width / 2;
  const cy = height / 2;
  const ringRadius = radius + 4;
  const ringLength = 2 * Math.PI * ringRadius;

  const capture = async () => {
    if (capturing.current || !camera.current) return;
    capturing.current = true;
    setStatus("faceCapturing");
    setFaceOk(true);
    // The ring is complete by the time the picture is taken: the automatic
    // capture fires when its sweep finishes, and the shutter button fills it.
    holding.current = false;
    sweep.stopAnimation();
    sweep.setValue(1);
    try {
      const photo = await camera.current.takePhoto({
        flash: device?.hasFlash ? flash : "off",
      });
      setProcessing(true);
      // Crop, score (frontal faces) and save straight away; the review screen
      // that follows only offers Recapture or Done.
      const cropped: CroppedFace = await cropToFace(photo.path, pose);
      const current = facesRef.current;
      const existing = current.findIndex((f) => f.pose === pose);
      const index = existing === -1 ? current.length : existing;
      const dto = await buildFaceDTO(pose, index, cropped);
      setValue<FaceDTO>(`transaction.faces[${index}]`, dto);
      setReview(dto);
      logEvent("face", `captured pose ${pose}, ${cropped.width}x${cropped.height}`);
    } catch (e) {
      console.error("Face capture failed", e);
      capturing.current = false;
      setFaceOk(false);
      setStatus("faceCaptureFailed");
    } finally {
      sweep.setValue(0);
      setProcessing(false);
    }
  };
  // The loop below is started once; it always calls the latest capture().
  const captureRef = useRef(capture);
  captureRef.current = capture;

  // Watch the preview: take a small picture, look for the face, update the
  // status, and capture automatically after enough good ones in a row.
  const active = focused && hasPermission && !!device && !review;
  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let failures = 0;
    const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      await pause(600); // let the camera start
      while (!stopped) {
        if (capturing.current || !camera.current) {
          await pause(200);
          continue;
        }
        try {
          const snapshot = await camera.current.takeSnapshot({ quality: 60 });
          const check = await checkPreview(snapshot.path);
          if (stopped || capturing.current) continue;
          setStatus(check.status);
          setFaceOk(check.valid);
          // While the face stays good the green ring sweeps round, and the
          // picture is taken when it completes its loop. Moving out of
          // position clears the ring and the wait starts over.
          if (!check.valid) {
            holding.current = false;
            sweep.stopAnimation();
            sweep.setValue(0);
          } else if (!holding.current) {
            holding.current = true;
            sweep.setValue(0);
            Animated.timing(sweep, {
              toValue: 1,
              duration: AUTO_CAPTURE_HOLD_MS,
              easing: Easing.linear,
              useNativeDriver: false,
            }).start(({ finished }) => {
              if (finished && holding.current && !stopped) {
                holding.current = false;
                captureRef.current();
              }
            });
          }
        } catch (e) {
          // The camera may not be ready yet, or is switching lenses. Logged
          // (not every time) so a persistent failure shows up in Metro.
          if (failures++ % 10 === 0) {
            console.warn("Face preview check failed", e);
          }
          await pause(300);
        }
        await pause(120);
      }
    })();
    return () => {
      stopped = true;
      holding.current = false;
      sweep.stopAnimation();
    };
  }, [active, sweep]);

  const recapture = () => {
    setReview(null);
    capturing.current = false;
    setFaceOk(false);
    setStatus("faceSearching");
  };

  // Quality details for a frontal face, as on Android's Face Review.
  const viewQuality = async () => {
    if (!review?.image) return;
    await saveBase64Image(review.image, "ofiq.jpg", EncodingType.Base64);
    router.navigate({ pathname: "/ofiq" });
  };

  if (review) {
    // Android face_review.xml: Recapture at the top, the photo, the quality
    // score with an info button, and the button to finish at the bottom.
    return (
      <View
        style={[
          styles.screen,
          styles.review,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <Button
          text={tHelper("recapture")}
          variant="secondary"
          icon="camera-retake"
          onPress={recapture}
        />
        <Image
          source={{ uri: `data:image/jpeg;base64,${review.image}` }}
          style={styles.reviewImage}
          resizeMode="contain"
        />
        {review.ofiqResults ? (
          <Pressable
            onPress={viewQuality}
            accessibilityRole="button"
            style={styles.quality}
          >
            <Text style={styles.qualityText}>
              {tHelper("qualityScore")}
              {review.ofiqResults.score.toFixed(0)}
            </Text>
            <MaterialCommunityIcons
              name="information-outline"
              size={26}
              color="#FFFFFF"
            />
          </Pressable>
        ) : null}
        <Button text={tHelper("done")} icon="check" onPress={router.back} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {device && hasPermission ? (
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          format={format}
          photoQualityBalance="quality"
          isActive={focused && !processing}
          photo
          // The preview pictures come from the video stream.
          video
          audio={false}
        />
      ) : (
        <View style={styles.processing}>
          <Text style={styles.processingText}>
            {tHelper(hasPermission ? "faceNoCamera" : "allowCamera")}
          </Text>
        </View>
      )}

      {/* Shaded overlay with the circular guide cut out of it. */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path
          fillRule="evenodd"
          fill={SHADE}
          d={`M0 0H${width}V${height}H0Z M${cx - radius} ${cy}a${radius} ${radius} 0 1 0 ${radius * 2} 0a${radius} ${radius} 0 1 0 ${-radius * 2} 0Z`}
        />
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={faceOk ? GREEN : "#FFFFFF"}
          strokeWidth={4}
        />
        {/* Green ring that sweeps clockwise from the top during capture. */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={ringRadius}
          fill="none"
          stroke={GREEN}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${ringLength} ${ringLength}`}
          strokeDashoffset={sweep.interpolate({
            inputRange: [0, 1],
            outputRange: [ringLength, 0],
          })}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>

      <View style={[styles.pill, { top: insets.top + 28 }]}>
        <Text style={styles.pillText}>{tHelper(status)}</Text>
      </View>

      <Pressable
        onPress={() =>
          setFlash((m) => (m === "auto" ? "on" : m === "on" ? "off" : "auto"))
        }
        accessibilityRole="button"
        accessibilityLabel={tHelper("faceFlash")}
        style={[styles.iconButton, { top: insets.top + 8, left: 12 }]}
      >
        <MaterialCommunityIcons
          name={FLASH_ICONS[flash]}
          size={30}
          color="#FFFFFF"
        />
      </Pressable>
      <Pressable
        onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
        accessibilityRole="button"
        accessibilityLabel={tHelper("faceFlip")}
        style={[styles.iconButton, { top: insets.top + 8, right: 12 }]}
      >
        <MaterialCommunityIcons
          name="camera-flip"
          size={30}
          color="#FFFFFF"
        />
      </Pressable>

      <View style={[styles.bottom, { bottom: insets.bottom + 36 }]}>
        <Pressable
          onPress={router.back}
          accessibilityRole="button"
          accessibilityLabel={tHelper("cancel")}
          style={styles.cancel}
          hitSlop={10}
        >
          <MaterialCommunityIcons name="close" size={30} color="#FFFFFF" />
        </Pressable>
        <Pressable
          onPress={capture}
          accessibilityRole="button"
          accessibilityLabel={tHelper("faceShutter")}
          style={({ pressed }) => [
            styles.shutter,
            pressed && styles.shutterPressed,
          ]}
        >
          <View style={styles.shutterInner} />
        </Pressable>
        <View style={styles.cancel} />
      </View>

      {processing && (
        <View style={styles.processing}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.processingText}>{tHelper("faceProcessing")}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000000" },
  pill: {
    position: "absolute",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#000000AA",
  },
  pillText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  iconButton: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#00000080",
    alignItems: "center",
    justifyContent: "center",
  },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  cancel: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  // Red shutter with a white ring, as on Android.
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterPressed: { transform: [{ scale: 0.85 }] },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#D4242C",
  },
  processing: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000CC",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  processingText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  review: { paddingHorizontal: 16, gap: 12 },
  reviewImage: { flex: 1 },
  quality: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  qualityText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
});
