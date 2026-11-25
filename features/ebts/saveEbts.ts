import * as ImageManipulator from "expo-image-manipulator";
import {
  cacheDirectory,
  deleteAsync,
  EncodingType,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";

/**
 * A small JPEG of a face photo (base64 in, base64 out) for the Submissions
 * card. Undefined if there is no photo or it can't be resized.
 */
export const makeThumbnail = async (
  jpegBase64?: string | null,
): Promise<string | undefined> => {
  if (!jpegBase64) return undefined;
  const temp = `${cacheDirectory}iw-thumb.jpg`;
  try {
    await writeAsStringAsync(temp, jpegBase64, {
      encoding: EncodingType.Base64,
    });
    const small = await ImageManipulator.manipulateAsync(
      temp,
      [{ resize: { width: 320 } }],
      { format: ImageManipulator.SaveFormat.JPEG, compress: 0.6, base64: true },
    );
    return small.base64 ?? undefined;
  } catch (error) {
    console.warn("Could not make the submission thumbnail", error);
    return undefined;
  } finally {
    deleteAsync(temp, { idempotent: true }).catch(() => undefined);
  }
};

/** Reads a recorded file (the voice sample) as base64 for the EBTS file. */
export const readFileBase64 = (uri: string) =>
  readAsStringAsync(uri, { encoding: EncodingType.Base64 });
