import FaceDetection, {
  Face,
  Landmark,
  Point,
} from "@react-native-ml-kit/face-detection";
import * as ImageManipulator from "expo-image-manipulator";
import { tHelper } from '@/translations/translationHelper';

export interface InterEyeDistance {
  interEyeDistance: number;
  meetsInterEyeDistanceRequirement: boolean;
  meetsInterEyeDistanceBestPractice: boolean;
  interEyeDistanceDescription: string;
}

export interface HeadSize {
  faceMidPointHorizontalPosition: number;
  meetsFaceMidPointHorizontalPositionRequirement: boolean;
  faceMidPointHorizontalPositionDescription: string;
  faceMidPointVerticalPosition: number;
  meetsFaceMidPointVerticalPositionRequirement: boolean;
  faceMidPointVerticalPositionDescription: string;
  headWidthRatio: number;
  meetsHeadWidthRatioRequirement: boolean;
  headWidthRatioDescription: string;
  headHeightRatio: number;
  meetsHeadHeightRatioRequirement: boolean;
  headHeightRatioDescription: string;
  yaw: number;
  meetsYawRequirement: boolean;
  yawDescription: string;
  pitch: number;
  meetsPitchRequirement: boolean;
  meetsPitchBestPractice: boolean;
  pitchDescription: string;
  roll: number;
  meetsRollRequirement: boolean;
  meetsRollBestPractice: boolean;
  rollDescription: string;
}

export interface EyesOpen {
  rightEyeOpenProbability: number;
  rightEyeOpenProbabilityDescription: string;
  leftEyeOpenProbability: number;
  leftEyeOpenProbabilityDescription: string;
  rightEyeOpen: boolean;
  leftEyeOpen: boolean;
}

export interface OFIQResults {
  interEyeDistance?: InterEyeDistance;
  headSize?: HeadSize;
  eyesOpen?: EyesOpen;
  score: number;
  passed: boolean;
  meets: boolean;
  face?: Face;
  success: boolean;
}

export interface ImageDetails {
  path?: string;
  height: number;
  width: number;
}

export async function processImage(image: ImageDetails): Promise<OFIQResults> {
  if (!image.path) {
    throw new Error("Image path is required for face detection.");
  }

  // first get dimensions

const reduced = await ImageManipulator.manipulateAsync(
    image.path,
    [{ resize: { width: image.width / 1, height: image.height / 1 } }],
    { format: ImageManipulator.SaveFormat.JPEG },
  );

  const faceResult = await FaceDetection.detect(reduced.uri, {
    landmarkMode: "all",
    contourMode: "all",
    classificationMode: "all",
    minFaceSize: 0,
  });
  
//   console.log("FACE RESULT: " + faceResult);

  const interEyeDistance = {} as InterEyeDistance;
  const headSize = {} as HeadSize;
  const eyesOpen = {} as EyesOpen;
  var results = {} as OFIQResults;

  if (faceResult) {
    results = performCalculations(faceResult[0], image);
  }
  return results;
}

function performCalculations(face: Face, image: ImageDetails): OFIQResults {
  const results = {} as OFIQResults;
  results.face = face;
  results.score = 0;
  results.passed = false;
  results.meets = false;
  calculateInterEyeDistance(face, results);
  calculateHeadSize(face, results, image);
  calculateEyes(face, results);
  results.score = (results.score / 10) * 100;
  if (results.score >= 80) results.passed = true;
  if (results.score >= 70) results.meets = true;
  return results;
}

function calculateInterEyeDistance(face: Face, results: OFIQResults) {
  if (face.landmarks) {
    // The straight-line distance between the eye centers. (It used to be
    // right x minus left x, which goes negative when the detector reports the
    // eyes the other way round, and that failed every image.)
    var ied = Math.hypot(
      face.landmarks.rightEye.position.x - face.landmarks.leftEye.position.x,
      face.landmarks.rightEye.position.y - face.landmarks.leftEye.position.y,
    );
    var meetsReq: boolean = false;
    var meetsBest: boolean = false;
    if (ied > 90) {
      meetsReq = true;
      results.score = results.score + 0.5;
    } else {
      meetsReq = false;
    }
    if (ied > 240) {
      meetsBest = true;
      results.score = results.score + 0.5;
    } else {
      meetsBest = false;
    }
    var iedResult: InterEyeDistance = {
      interEyeDistance: ied,
      meetsInterEyeDistanceRequirement: meetsReq,
      meetsInterEyeDistanceBestPractice: meetsBest,
      interEyeDistanceDescription:
        tHelper("iedDesc"),
    };
    results.interEyeDistance = iedResult;

    //     Object.entries(face.landmarks).map(([key, landmark]) => {
    //         console.log("LANDMARK: " + key);
    //     })
  }
}

function calculateHeadSize(
  face: Face,
  results: OFIQResults,
  image: ImageDetails,
) {
  if (face.landmarks) {
    var midHor =
      (face.landmarks.rightEye.position.x + face.landmarks.leftEye.position.x) /
      2;
    var midPointHor = midHor / image.width;
    var meetsFaceMidPointHorizontalPositionRequirement: boolean = false;
    if (midPointHor >= 0.45 && midPointHor <= 0.55) {
      meetsFaceMidPointHorizontalPositionRequirement = true;
      results.score = results.score + 1;
    }

    var midVer =
      (face.landmarks.rightEye.position.y + face.landmarks.leftEye.position.y) /
      2;
    var midPointVer = midVer / image.height;
    var meetsFaceMidPointVerticalPositionRequirement: boolean = false;
    if (midPointVer >= 0.3 && midPointVer <= 0.5) {
      meetsFaceMidPointVerticalPositionRequirement = true;
      results.score = results.score + 1;
    }

    // Ear to ear, whichever order the detector reports the ears in.
    var headWidth = Math.abs(
      face.landmarks.rightEar.position.x - face.landmarks.leftEar.position.x,
    );
    var headWidthRatio = headWidth / image.width;
    var meetsHeadWidthRatioRequirement: boolean = false;
    if (headWidthRatio >= 0.5 && headWidthRatio <= 0.75) {
      meetsHeadWidthRatioRequirement = true;
      results.score = results.score + 1;
    }

    var top = 0.0;
    var bottom = image.height;
    if (face.contours) {
      Object.entries(face.contours).map(([key, contour]) => {
        contour.points.forEach((p, index, array) => {
          if (p.y > top) {
            top = p.y;
          }
          if (p.y < bottom) {
            bottom = p.y;
          }
        });
      });
    }
    var headHeight = top - bottom;
    var headHeightRatio = headHeight / image.height;
    var meetsHeadHeightRatioRequirement = false;
    if (headHeightRatio >= 0.6 && headHeightRatio <= 0.9) {
      meetsHeadHeightRatioRequirement = true;
      results.score = results.score + 1;
    }

    var roll = face.rotationZ;
    var meetsRollBestPractice = false;
    var meetsRollRequirement = false;
    if (roll > -5 && roll < 5) {
      meetsRollBestPractice = true;
      meetsRollRequirement = true;
      results.score = results.score + 1;
    } else if (roll > -8 && roll < 8) {
      meetsRollRequirement = true;
      results.score = results.score + 0.5;
    }

    var pitch = face.rotationX;
    var meetsPitchBestPractice = false;
    var meetsPitchRequirement = false;
    if (pitch > -5 && pitch < 5) {
      meetsPitchBestPractice = true;
      meetsPitchRequirement = true;
      results.score = results.score + 1;
    } else if (pitch > -8 && pitch < 8) {
      meetsPitchRequirement = true;
      results.score = results.score + 0.5;
    }

    var yaw = face.rotationY;
    var meetsYawRequirement = false;
    if (yaw > -5 && yaw < 5) {
      meetsYawRequirement = true;
      results.score = results.score + 1;
    }

    var headSize: HeadSize = {
      faceMidPointHorizontalPosition: midPointHor,
      meetsFaceMidPointHorizontalPositionRequirement:
        meetsFaceMidPointHorizontalPositionRequirement,
      faceMidPointHorizontalPositionDescription:
        tHelper("faceMidHorDesc"),
      faceMidPointVerticalPosition: midPointVer,
      meetsFaceMidPointVerticalPositionRequirement:
        meetsFaceMidPointVerticalPositionRequirement,
      faceMidPointVerticalPositionDescription:
        tHelper("faceMidVerDesc"),
      headWidthRatio: headWidthRatio,
      meetsHeadWidthRatioRequirement: meetsHeadWidthRatioRequirement,
      headWidthRatioDescription:
        tHelper("headWidthDesc"),
      headHeightRatio: headHeightRatio,
      meetsHeadHeightRatioRequirement: meetsHeadHeightRatioRequirement,
      headHeightRatioDescription:
        tHelper("headHeightDesc"),
      yaw: yaw,
      meetsYawRequirement: meetsYawRequirement,
      yawDescription:
        tHelper("yawDesc"),
      pitch: pitch,
      meetsPitchRequirement: meetsPitchRequirement,
      meetsPitchBestPractice: meetsPitchBestPractice,
      pitchDescription:
        tHelper("pitchDesc"),
      roll: roll,
      meetsRollRequirement: meetsRollRequirement,
      meetsRollBestPractice: meetsRollBestPractice,
      rollDescription:
        tHelper("rollDesc"),
    };
    results.headSize = headSize;
  }
}

function calculateEyes(face: Face, results: OFIQResults) {
  var rightEyeOpenProbability = face.leftEyeOpenProbability;
  var rightEyeOpen: boolean = false;
  var leftEyeOpenProbability = face.rightEyeOpenProbability;
  var leftEyeOpen: boolean = false;

  if (rightEyeOpenProbability && rightEyeOpenProbability > 0.75) {
    rightEyeOpen = true;
    results.score = results.score + 1;
  }
  if (leftEyeOpenProbability && leftEyeOpenProbability > 0.75) {
    leftEyeOpen = true;
    results.score = results.score + 1;
  }
  var eyesOpen: EyesOpen = {
    rightEyeOpenProbability: rightEyeOpenProbability
      ? rightEyeOpenProbability
      : 0,
    rightEyeOpenProbabilityDescription:
      tHelper("rightEyeProbDesc"),
    leftEyeOpenProbability: leftEyeOpenProbability ? leftEyeOpenProbability : 0,
    leftEyeOpenProbabilityDescription:
      tHelper("leftEyeProbDesc"),
    rightEyeOpen: rightEyeOpen,
    leftEyeOpen: leftEyeOpen,
  };
  results.eyesOpen = eyesOpen;
}
