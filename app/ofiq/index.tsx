import FaceMap from "@/features/ofiq/FaceMap";
import {
  ImageDetails,
  OFIQResults,
  processImage,
} from "@/features/ofiq/OFIQCalculator";
import OFIQResultsDisplay from "@/features/ofiq/OFIQResultsDisplay";
import PreviewImage from "@/features/ofiq/PreviewImage";
import { documentDirectory } from "expo-file-system";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

const filePath = `${documentDirectory}ofiq.jpg`;

export default function OFIQScreen() {
  const [image, setImage] = useState<ImageDetails>();
  const [ofiq, setOFIQ] = useState<OFIQResults>();

  useEffect(() => {
    const currentImage = {
      path: filePath,
      width: 1000,
      height: 1000,
    };
    processImage(currentImage).then((ofiq) => {
      setOFIQ(ofiq);
      setImage(currentImage);
    });
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      contentInsetAdjustmentBehavior="automatic"
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
  );
}

const styles = StyleSheet.create({
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
