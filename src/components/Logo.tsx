import Image from "next/image";

/** MaxPro Technology wordmark. `white` is the variant for dark backgrounds. */
export function Logo({ variant = "default", className = "h-9 w-auto" }: { variant?: "default" | "white"; className?: string }) {
  return (
    <Image
      src={variant === "white" ? "/img/logo-white.png" : "/img/logo.png"}
      alt="MaxPro Technology"
      width={1389}
      height={296}
      priority
      className={className}
    />
  );
}
