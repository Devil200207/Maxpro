import Image from "next/image";

/** AqarPro wordmark. `white` is the variant for dark backgrounds. */
export function Logo({ variant = "default", className = "h-9 w-auto" }: { variant?: "default" | "white"; className?: string }) {
  return (
    <Image
      src={variant === "white" ? "/img/logo-white.png" : "/img/logo.png"}
      alt="AqarPro"
      width={2201}
      height={445}
      priority
      className={className}
    />
  );
}
