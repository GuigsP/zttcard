import av1 from "@/assets/avatars/av1.png";
import av2 from "@/assets/avatars/av2.png";
import av3 from "@/assets/avatars/av3.png";
import av4 from "@/assets/avatars/av4.png";
import av5 from "@/assets/avatars/av5.png";
import av6 from "@/assets/avatars/av6.png";
import av7 from "@/assets/avatars/av7.png";
import av8 from "@/assets/avatars/av8.png";

export type AvatarKey = "av1" | "av2" | "av3" | "av4" | "av5" | "av6" | "av7" | "av8";

export const AVATARS: Record<AvatarKey, string> = {
  av1,
  av2,
  av3,
  av4,
  av5,
  av6,
  av7,
  av8,
};

export const AVATAR_KEYS: AvatarKey[] = [
  "av1",
  "av2",
  "av3",
  "av4",
  "av5",
  "av6",
  "av7",
  "av8",
];

export function avatarUrl(key: string | null | undefined): string {
  if (key && key in AVATARS) return AVATARS[key as AvatarKey];
  return AVATARS.av1;
}
