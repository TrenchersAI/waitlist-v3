import Image from "next/image";
import logoMark from "./icons/logo-mark.svg";

export default function Logo() {
  return (
    <div className="relative h-[320px] w-full">
      <div className="absolute inset-0 flex items-center justify-center">
        <Circle className="absolute animate-spin [animation-duration:2s]" />
        <Image
          src={logoMark}
          alt="Trenchers logo mark"
          width={196}
          height={215}
          // className="opacity-95"
          priority
        />
        <CircleSecond className="absolute animate-spin [animation-duration:2s]" />
      </div>
    </div>
  );
}

function Circle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="313"
      height="313"
      viewBox="0 0 313 313"
      fill="none"
      {...props}
    >
      <path
        d="M312.5 156.5C312.5 70.3436 242.656 0.5 156.5 0.5C70.3436 0.5 0.5 70.3436 0.5 156.5C0.5 242.656 70.3436 312.5 156.5 312.5C242.656 312.5 312.5 242.656 312.5 156.5Z"
        stroke="#2F2F2F"
        strokeLinecap="round"
        strokeDasharray="2 4 8 4"
      />
    </svg>
  );
}

function CircleSecond(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="329"
      height="329"
      viewBox="0 0 329 329"
      fill="none"
      {...props}
    >
      <path
        d="M328.5 164.5C328.5 73.9253 255.075 0.5 164.5 0.5C73.9253 0.5 0.5 73.9253 0.5 164.5C0.5 255.075 73.9253 328.5 164.5 328.5C255.075 328.5 328.5 255.075 328.5 164.5Z"
        stroke="#2F2F2F"
        strokeLinecap="round"
        strokeDasharray="2 4 8 4"
      />
    </svg>
  );
}
