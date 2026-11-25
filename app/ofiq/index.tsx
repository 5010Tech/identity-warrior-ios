import FaceMap from "@/features/ofiq/FaceMap";
import {
  ImageDetails,
  OFIQResults,
  processImage,
} from "@/features/ofiq/OFIQCalculator";
import OFIQResultsDisplay from "@/features/ofiq/OFIQResultsDisplay";
import PreviewImage from "@/features/ofiq/PreviewImage";
// The legacy module is the one that still exports documentDirectory in Expo 54.
import { deleteAsync, documentDirectory } from "expo-file-system/legacy";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { tHelper } from "@/translations/translationHelper";
import { useRouter } from "expo-router";
import { Image, ScrollView, StyleSheet, View } from "react-native";

const filePath = `${documentDirectory}ofiq.jpg`;

export default function OFIQScreen() {
  const [image, setImage] = useState<ImageDetails>();
  const [ofiq, setOFIQ] = useState<OFIQResults>();
  const router = useRouter();

  // The photo being scored is a plain copy in the app's documents, which the
  // Files app and Finder can see. Remove it when this screen closes.
  useEffect(
    () => () => {
      deleteAsync(filePath, { idempotent: true }).catch(() => undefined);
    },
    [],
  );

  useEffect(() => {
    // Measure on a copy 1000px wide that keeps the photo's own proportions.
    // (It used to be forced to 1000 x 1000, which stretched any photo that
    // wasn't square and threw the overlay and the measurements off.)
    Image.getSize(
      filePath,
      (width, height) => {
        const currentImage = {
          path: filePath,
          width: 1000,
          height: Math.round((1000 * height) / Math.max(width, 1)),
        };
        processImage(currentImage).then((ofiq) => {
          setOFIQ(ofiq);
          setImage(currentImage);
        });
      },
      (e) => console.error("Could not read the face image", e),
    );
  }, []);

  return (
    <View style={styles.screen}>
      {/* Always on screen, above the scrolling results. */}
      <View style={styles.back}>
        <Button
          text={tHelper("back")}
          variant="secondary"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        />
      </View>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContainer}
      contentInsetAdjustmentBehavior="never"
    >
      <View style={styles.container}>
        {image && (
          <View style={styles.imageContainer}>
            <PreviewImage source={image.path || ""} />

            {ofiq && ofiq.face && (
              <FaceMap
                key={Math.random()}
                face={ofiq.face}
                width={image.width}
                height={image.height}
                showFrame
                showContours
                showLandmarks
              />
            )}
            {ofiq &&
              ofiq.interEyeDistance &&
              ofiq.headSize &&
              ofiq.eyesOpen && (
                <OFIQResultsDisplay
                  interEyeDistance={ofiq.interEyeDistance}
                  headSize={ofiq.headSize}
                  eyesOpen={ofiq.eyesOpen}
                  score={ofiq.score}
                  passed={ofiq.passed}
                  meets={ofiq.meets}
                />
              )}
          </View>
        )}
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  // This screen opens as a sheet, which already sits clear of the status bar.
  back: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  scrollContainer: {
    minHeight: "100%",
    minWidth: "100%",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    marginTop: 15,
    marginBottom: 20,
  },
});
