import Image from "next/image";

/** AqarPro wordmark. `white` is the variant for dark backgrounds. */
export function Logo({ variant = "default", className = "h-9 w-auto" }: { variant?: "default" | "white"; className?: string }) {
  return (
    <Image
      src={variant === "white" ? "/img/aqarpro-logo-white.png" : "/img/aqarpro-logo.png"}
      alt="AqarPro"
      width={1356}
      height={330}
      priority
      className={className}
    />
  );
}
