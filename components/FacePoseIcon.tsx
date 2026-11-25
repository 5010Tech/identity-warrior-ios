import { themeColors } from "@/constants/style/Colors";
import { Pose } from "@/types";
import Svg, { Circle, G, Path } from "react-native-svg";

/**
 * Face pose icons: a line-drawn head (with ears, neck and shoulders) above a
 * rotation dial whose red marker shows how far the head is turned: centered
 * for frontal, at the end for a profile, in between for an angled face.
 *
 * Drawn on a 96 x 112 canvas, facing the viewer's left. The right-facing poses
 * are the same drawings mirrored.
 */
type Shape = "frontal" | "profile" | "angled";

const HEADS: Record<Shape, { outline: string; details: string }> = {
  frontal: {
    outline:
      "M48 14C62 14 68 26 67 40C66 54 58 64 48 64C38 64 30 54 29 40C28 26 34 14 48 14Z",
    // ears, then neck into shoulders
    details:
      "M29 35q-5 5 1 11M67 35q5 5-1 11M41 63V68Q27 70 22 80M55 63V68Q69 70 74 80",
  },
  profile: {
    outline:
      "M46 68L46 64L42 64C36 65 32 63 31 59L32 55L30 53L31 48L26 46L32 37L33 32C33 22 40 14 52 14C66 14 72 26 71 40C70 50 66 56 60 60L60 68",
    // ear, then shoulders
    details: "M55 35q6 5 0 11M46 68Q33 70 29 80M60 68Q72 71 76 80",
  },
  angled: {
    outline:
      "M46 14C60 13 68 25 67 40C66 54 58 64 47 64C39 64 33 58 31 50L29 41C28 26 34 15 46 14Z",
    // near ear, neck into shoulders, and a nose line to show the turn
    details:
      "M67 35q5 5-1 11M40 63V68Q27 70 22 80M55 62V68Q69 70 74 80M38 37L35 46L39 47",
  },
};

/** Where the red marker sits on the dial for each amount of turn. */
const MARKERS: Record<Shape, { cx: number; cy: number }> = {
  frontal: { cx: 48, cy: 105 },
  profile: { cx: 22, cy: 96 },
  angled: { cx: 31, cy: 103 },
};

const POSES: Record<Pose, { shape: Shape; mirrored?: boolean }> = {
  F: { shape: "frontal" },
  L: { shape: "profile" },
  R: { shape: "profile", mirrored: true },
  LA: { shape: "angled" },
  RA: { shape: "angled", mirrored: true },
};

const DIAL = "M22 96A26 9 0 0 0 74 96";
const DIAL_COLOR = "#7B848E";

interface FacePoseIconProps {
  pose: Pose;
  /** Height of the icon; it is a little narrower than it is tall. */
  size: number;
  /** Line color for the head. */
  color: string;
}

export function FacePoseIcon({ pose, size, color }: FacePoseIconProps) {
  const { shape, mirrored } = POSES[pose];
  const head = HEADS[shape];
  const marker = MARKERS[shape];
  return (
    <Svg width={(size * 96) / 112} height={size} viewBox="0 0 96 112">
      <G transform={mirrored ? "translate(96 0) scale(-1 1)" : undefined}>
        <Path d={head.outline} fill="none" stroke={color} strokeWidth={2.5} />
        <Path
          d={head.details}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d={DIAL}
          fill="none"
          stroke={DIAL_COLOR}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <Circle cx={marker.cx} cy={marker.cy} r={5} fill={themeColors.red} />
      </G>
    </Svg>
  );
}
