import { Platform } from "react-native";

import * as ScopedStorage from "react-native-scoped-storage";
import * as RNFS from "react-native-fs";

import Face from "react-native-slapshot-capture-library/src/Face";
import Fingerprint from "react-native-slapshot-capture-library/src/Fingerprint";
import { EncodingType } from "react-native-slapshot-capture-library";

const exportData_Android = async (
  identityId: string,
  fingerprints: Fingerprint[],
  faces: Face[],
): Promise<boolean> => {
  let dir = await ScopedStorage.openDocumentTree(true);
  let childDir = await ScopedStorage.createDirectory(dir.uri, identityId);

  fingerprints.forEach(async (fingerprint) => {
    const filename = `${fingerprint.fingerType}_${fingerprint.dpi}dpi.${fingerprint.image?.encodingType.toLowerCase()}`;
    const mimeType = encodingTypeToMimeType(fingerprint.image!.encodingType);

    await ScopedStorage.writeFile(
      childDir.uri,
      fingerprint.image!.imageBytesBase64,
      filename,
      mimeType,
      "base64",
    );
  });

  let faceIdx = 1;
  faces.forEach(async (face) => {
    const filename = `face.${faceIdx++}.${face.image?.encodingType.toLowerCase()}`;
    const mimeType = encodingTypeToMimeType(face.image!.encodingType);

    await ScopedStorage.writeFile(
      childDir.uri,
      face.image!.imageBytesBase64,
      filename,
      mimeType,
      "base64",
    );
  });

  return true;
};

const exportData_iOS = async (
  identityId: string,
  fingerprints: Fingerprint[],
  faces: Face[],
): Promise<boolean> => {
  const path = `${RNFS.DocumentDirectoryPath}/${identityId}`;

  try {
    await RNFS.mkdir(path);

    fingerprints.forEach(async (fingerprint) => {
      const filename = `${fingerprint.fingerType}_${fingerprint.dpi}dpi.${fingerprint.image?.encodingType.toLowerCase()}`;
      const mimeType = encodingTypeToMimeType(fingerprint.image!.encodingType);

      const filePath = `${path}/${filename}`;
      await RNFS.writeFile(
        filePath,
        fingerprint.image!.imageBytesBase64,
        "base64",
      );
    });

    let faceIdx = 1;
    faces.forEach(async (face) => {
      const filename = `face.${faceIdx++}.${face.image?.encodingType.toLowerCase()}`;
      const mimeType = encodingTypeToMimeType(face.image!.encodingType);

      // await ScopedStorage.writeFile(childDir.uri, face.image!.imageBytesBase64, filename, mimeType, "base64");
    });

    return true;
  } catch (e) {
    console.log("error", e);
    return false;
  }
};

export const exportData = async (
  identityId: string,
  fingerprints: Fingerprint[],
  faces: Face[],
): Promise<boolean | undefined> => {
  // determine which biometrics were captured/exportable and export them
  const exportableResults = fingerprints.filter((x) => x.image !== undefined);
  const exportableFaces = faces.filter((x) => x.image !== undefined);
  if (exportableResults.length !== 0 || exportableFaces.length !== 0) {
    let os = Platform.OS;
    if (os == "android") {
      return await exportData_Android(identityId, fingerprints, faces);
    }

    if (os == "ios") {
      return await exportData_iOS(identityId, fingerprints, faces);
    }
  }

  throw new Error("Unsupported Platform");
};

const encodingTypeToMimeType = (encodingType: EncodingType): string => {
  switch (encodingType) {
    case EncodingType.Png:
      return "image/png";

    case EncodingType.Wsq:
    case EncodingType.Raw:
      return "application/octet-stream";

    default:
      return "application/octet-stream";
  }
};
