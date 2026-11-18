import { Base64Image } from "@/types";
import {
  documentDirectory,
  writeAsStringAsync,
  readAsStringAsync,
  getInfoAsync,
  makeDirectoryAsync,
  deleteAsync,
  EncodingType,
} from "expo-file-system/legacy";

export const saveBase64Image = async (
  image: Base64Image,
  filePath: string,
  encoding?: EncodingType,
) => {
  try {
    const fileUri = `${documentDirectory}${filePath}`;
    const folderUri = fileUri.slice(0, fileUri.lastIndexOf("/"));
    const folderInfo = await getInfoAsync(folderUri);
    !folderInfo.exists &&
      (await makeDirectoryAsync(folderUri, { intermediates: true }));

    await writeAsStringAsync(
      fileUri,
      image,
      encoding ? { encoding } : undefined,
    );

    return fileUri;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const saveBase64ImageWithEncoding = async (
  image: Base64Image,
  filePath: string,
) => {
  try {
    const fileUri = `${documentDirectory}${filePath}`;
    const folderUri = fileUri.slice(0, fileUri.lastIndexOf("/"));
    const folderInfo = await getInfoAsync(folderUri);
    !folderInfo.exists &&
      (await makeDirectoryAsync(folderUri, { intermediates: true }));

    console.log(image);
    await writeAsStringAsync(fileUri, image, {
      encoding: EncodingType.Base64,
    });

    return fileUri;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getBase64Image = async (
  fileUri: string,
): Promise<Base64Image | undefined> => {
  try {
    return fileUri && readAsStringAsync(fileUri);
  } catch (error) {
    console.error("Error reading file:", error);
    return undefined;
  }
};

export const deleteFileOrDirectory = async (path: string) => {
  const uri = `${documentDirectory}${path}`;
  try {
    const fileInfo = await getInfoAsync(uri);

    if (fileInfo.exists) {
      if (fileInfo.isDirectory) {
        await deleteAsync(uri, { idempotent: true });
      } else {
        await deleteAsync(uri);
      }
    } else {
      console.warn("Could not delete %s because it doesn't exist", uri);
    }
  } catch (error) {
    console.error("Error deleting:", error);
  }
};
