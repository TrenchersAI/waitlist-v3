import type { Metadata } from "next";
import AvatarLab from "./avatar-lab";

export const metadata: Metadata = {
  title: "Comet spirits · Avatar lab",
  robots: { index: false, follow: false },
};

export default function AvatarLabPage() {
  return <AvatarLab />;
}
