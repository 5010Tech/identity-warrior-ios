import { OFIQResults, processImage } from "@/features/ofiq/OFIQCalculator";
import { translationKey } from "@/translations/translationHelper";
import { FaceDTO, Pose } from "@/types";
import { deleteFileOrDirectory, saveBase64Image } from "@/util/fs";
import FaceDetection, { Face } from "@react-native-ml-kit/face-detection";
import { EncodingType, deleteAsync } from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";

/**
 * Face capture without Slapshot, following the Android BDSP build's
 * FaceCaptureActivity: find the face in the camera picture, check it sits in
 * the guide circle at a sensible size, and crop the final photo around it.
 */

/** Face width as a fraction of the guide circle's diameter (Android FACE_MIN/MAX_RATIO). */
const FACE_MIN_RATIO = 0.3;
const FACE_MAX_RATIO = 0.7;
/** Longest side of the saved face image (Android MAX_DIMENSION). */
const MAX_DIMENSION = 1280;
/** Preview pictures are shrunk to this width before looking for a face. */
const ANALYSIS_WIDTH = 480;

export interface FaceCheck {
  status: translationKey;
  /** True when the face is placed well enough to capture. */
  valid: boolean;
}

export interface NormalizedImage {
  uri: string;
  width: number;
  height: number;
}

const largestFace = (faces: Face[]) =>
  faces.reduce<Face | undefined>(
    (best, face) =>
      !best ||
      face.frame.width * face.frame.height >
        best.frame.width * best.frame.height
        ? face
        : best,
    undefined,
  );

export const removeFile = (uri?: string) => {
  if (uri) deleteAsync(uri, { idempotent: true }).catch(() => undefined);
};

const asUri = (path: string) =>
  path.startsWith("file://") ? path : `file://${path}`;

/**
 * Rotations to try when no face is found. Camera pictures normally arrive the
 * right way up, but if a device hands them over sideways the first rotation
 * that finds a face is remembered and tried first from then on.
 */
let preferredRotation = 0;
const rotationsToTry = () => [
  preferredRotation,
  ...[0, 90, 270].filter((r) => r !== preferredRotation),
];

const findFace = async (
  sourceUri: string,
  width: number | undefined,
  rotations: number[],
): Promise<{ image: NormalizedImage; face?: Face }> => {
  let last: NormalizedImage | undefined;
  for (const rotation of rotations) {
    const image = await ImageManipulator.manipulateAsync(
      sourceUri,
      [
        ...(rotation ? [{ rotate: rotation }] : []),
        ...(width ? [{ resize: { width } }] : []),
      ],
      { format: ImageManipulator.SaveFormat.JPEG, compress: width ? 0.6 : 0.95 },
    );
    if (last) removeFile(last.uri);
    last = image;
    const face = largestFace(
      await FaceDetection.detect(image.uri, {
        performanceMode: width ? "fast" : "accurate",
        // The full-size photo needs the eye positions for framing.
        landmarkMode: width ? "none" : "all",
        contourMode: "none",
        classificationMode: "none",
        minFaceSize: 0.1,
      }),
    );
    if (face) {
      preferredRotation = rotation;
      return { image, face };
    }
  }
  return { image: last as NormalizedImage, face: undefined };
};

/**
 * Looks at one preview picture and says what the subject should do
 * (Android handleFaces). The guide circle is centered in the picture.
 */
export const checkPreview = async (path: string): Promise<FaceCheck> => {
  const source = asUri(path);
  // Only one rotation per preview picture, to keep the loop quick; the
  // alternates are cycled through while no face is being found.
  const rotation = rotationsToTry()[previewAttempt % 3];
  const { image, face } = await findFace(source, ANALYSIS_WIDTH, [rotation]);
  removeFile(source);
  removeFile(image.uri);
  if (!face) {
    previewAttempt++;
    return { status: "faceSearching", valid: false };
  }
  previewAttempt = 0;

  const radius = Math.min(image.width, image.height) * 0.42;
  const { left, top, width, height } = face.frame;
  const dx = left + width / 2 - image.width / 2;
  const dy = top + height / 2 - image.height / 2;
  if (Math.sqrt(dx * dx + dy * dy) > radius * 0.85) {
    return { status: "faceAlign", valid: false };
  }
  const ratio = width / (radius * 2);
  if (ratio > FACE_MAX_RATIO) return { status: "faceTooClose", valid: false };
  if (ratio < FACE_MIN_RATIO) return { status: "faceTooFar", valid: false };
  return { status: "faceHoldStill", valid: true };
};
let previewAttempt = 0;

export interface CroppedFace {
  base64: string;
  width: number;
  height: number;
}

/**
 * Framing for a face with both eyes found, sized from the distance between
 * the eyes so the saved image lands inside the quality (OFIQ) limits:
 *  - eyes 27% of the image width apart        (scored on a 1000px-wide copy:
 *                                              270px, best practice is > 240)
 *  - head (ear to ear) about 65% of the width (limits 50% to 75%)
 *  - eye line 47% of the way down             (limits 30% to 50%)
 *  - eyes centered left to right              (limits 45% to 55%)
 *  - face (forehead to chin, as the scoring measures it) at least 60% of the
 *    height (limits 60% to 90%). The frame is 3.8 eye-distances tall: any
 *    shorter starts to clip the top of the head or the chin.
 */
const EYES_TO_WIDTH = 0.27;
const HEIGHT_IN_EYE_DISTANCES = 3.8;
const EYE_LINE = 0.47;

const eyeFraming = (face: Face) => {
  const left = face.landmarks?.leftEye?.position;
  const right = face.landmarks?.rightEye?.position;
  if (!left || !right) return undefined;
  const eyeDistance = Math.hypot(left.x - right.x, left.y - right.y);
  // A profile shows the eyes almost on top of each other; use the box then.
  if (eyeDistance < face.frame.width * 0.2) return undefined;
  const width = eyeDistance / EYES_TO_WIDTH;
  const height = eyeDistance * HEIGHT_IN_EYE_DISTANCES;
  return {
    left: (left.x + right.x) / 2 - width / 2,
    top: (left.y + right.y) / 2 - height * EYE_LINE,
    width,
    height,
  };
};

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Where the guide circle sits in the photo: the subject was lined up inside
 * it, so this is the fallback frame when face detection can't be trusted. The
 * circle covers a little over half the photo's width (the preview is zoomed to
 * fill the screen), and the frame adds room for the whole head and shoulders.
 */
const guideFraming = (image: NormalizedImage): Box => {
  const width = Math.min(image.width, image.height) * 0.72;
  const height = Math.min(image.height, width * 1.25);
  return {
    left: (image.width - width) / 2,
    top: (image.height - height) / 2,
    width,
    height,
  };
};

/**
 * Frame for a turned head from the visible ear and the nose. Those two points
 * say which way the head faces and how deep it is, which the face box alone
 * can't: the back of the head lies about a third of the ear-to-nose distance
 * behind the ear (measured on captures; more than that crops far too wide). The head is centered and fills about 65% of the width, as on
 * a frontal capture, with the ear just above the middle.
 */
const earFraming = (face: Face): Box | undefined => {
  const nose = face.landmarks?.noseBase?.position;
  const ears = [
    face.landmarks?.leftEar?.position,
    face.landmarks?.rightEar?.position,
  ].filter((ear): ear is NonNullable<typeof ear> => !!ear);
  if (!nose || !ears.length) return undefined;
  // With both ears reported, the one further from the nose is the visible one.
  const ear = ears.reduce((a, b) =>
    Math.abs(a.x - nose.x) >= Math.abs(b.x - nose.x) ? a : b,
  );
  const side = Math.max(face.frame.width, face.frame.height);
  const depth = Math.abs(ear.x - nose.x);
  // Ear and nose on top of each other: not a usable pair of points.
  if (depth < side * 0.2) return undefined;
  const back = Math.sign(ear.x - nose.x);
  const front = nose.x - back * depth * 0.15;
  const rear = ear.x + back * depth * 0.35;
  const head = Math.max(Math.abs(rear - front), side * 1.1);
  const width = head / 0.72;
  const height = head * 1.5;
  return {
    left: (front + rear) / 2 - width / 2,
    top: ear.y - height * 0.48,
    width,
    height,
  };
};

/**
 * Frame for a turned head when the ear and nose weren't both found. The
 * detector's box hugs the visible part of the face and is often lopsided on a
 * profile, so the frame is built from the box's larger side, centered on the
 * box, with generous room for the back of the head, hair and neck.
 */
const turnedHeadFraming = (face: Face): Box => {
  const f = face.frame;
  const side = Math.max(f.width, f.height);
  const width = side * 1.8;
  const height = side * 2.1;
  return {
    left: f.left + f.width / 2 - width / 2,
    top: f.top + f.height / 2 - height * 0.48,
    width,
    height,
  };
};

/** A detection is only believed if it is a good size and inside the guide. */
const plausible = (face: Face, image: NormalizedImage) => {
  const guide = guideFraming(image);
  const f = face.frame;
  const cx = f.left + f.width / 2;
  const cy = f.top + f.height / 2;
  return (
    f.width > guide.width * 0.2 &&
    cx > guide.left &&
    cx < guide.left + guide.width &&
    cy > guide.top &&
    cy < guide.top + guide.height
  );
};

/**
 * Crops the full-size photo around the face and scales it down to at most
 * 1280 pixels on its longer side.
 *  - Frontal face with both eyes found: framed from the eyes (eyeFraming).
 *  - Profile / angled: framed from the visible ear and the nose (earFraming),
 *    or from the face box when those weren't found (turnedHeadFraming).
 *  - No believable face found: the area of the guide circle (guideFraming).
 */
export const cropToFace = async (
  path: string,
  pose: Pose = "F",
): Promise<CroppedFace> => {
  const source = asUri(path);
  const { image, face: found } = await findFace(
    source,
    undefined,
    rotationsToTry(),
  );
  removeFile(source);
  const face = found && plausible(found, image) ? found : undefined;

  const actions: ImageManipulator.Action[] = [];
  const box: Box = face
    ? ((pose === "F" ? eyeFraming(face) : earFraming(face)) ??
      turnedHeadFraming(face))
    : guideFraming(image);
  const originX = Math.max(0, Math.round(box.left));
  const originY = Math.max(0, Math.round(box.top));
  const right = Math.min(image.width, Math.round(box.left + box.width));
  const bottom = Math.min(image.height, Math.round(box.top + box.height));
  let width = right - originX;
  let height = bottom - originY;
  if (width > 0 && height > 0) {
    actions.push({ crop: { originX, originY, width, height } });
  } else {
    width = image.width;
    height = image.height;
  }
  if (Math.max(width, height) > MAX_DIMENSION) {
    actions.push(
      width >= height
        ? { resize: { width: MAX_DIMENSION } }
        : { resize: { height: MAX_DIMENSION } },
    );
  }
  const result = await ImageManipulator.manipulateAsync(image.uri, actions, {
    format: ImageManipulator.SaveFormat.JPEG,
    compress: 0.9,
    base64: true,
  });
  removeFile(image.uri);
  removeFile(result.uri);
  if (!result.base64) throw new Error("The face image could not be encoded.");
  return { base64: result.base64, width: result.width, height: result.height };
};

/**
 * Builds the face record for the collection. A frontal face also gets its
 * image-quality (OFIQ) score, as the Slapshot capture path did.
 */
export const buildFaceDTO = async (
  pose: Pose,
  index: number,
  face: CroppedFace,
): Promise<FaceDTO> => {
  let ofiqResults: OFIQResults | undefined;
  if (pose === "F") {
    try {
      const filePath = await saveBase64Image(
        face.base64,
        "ofiq.jpg",
        EncodingType.Base64,
      );
      if (filePath) {
        // Scored on a copy 1000px wide, keeping the photo's own proportions.
        ofiqResults = await processImage({
          path: filePath,
          width: 1000,
          height: Math.round((1000 * face.height) / face.width),
        });
        await deleteFileOrDirectory("ofiq.jpg");
      }
    } catch (e) {
      console.warn("Face quality scoring failed", e);
    }
  }
  return {
    referenceId: `F-${pose}-${index}`,
    imageHeight: face.height,
    imageWidth: face.width,
    image: face.base64,
    captureDate: new Date(),
    compression: "JPEGB",
    pose,
    ofiqResults,
  };
};
