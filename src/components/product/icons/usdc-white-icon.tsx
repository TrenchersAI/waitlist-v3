import type { SVGProps } from "react";
import UsdcMonoMark from "./usdc-mono-mark";

/** Same USDC mark as `UsdcIcon`, solid white with $ / rings cut out. */
export default function UsdcWhiteIcon(props: SVGProps<SVGSVGElement>) {
  return <UsdcMonoMark fill="#FFFFFF" {...props} />;
}
