import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = Readonly<{
  href?: string;
  priority?: boolean;
  className?: string;
}>;

function LogoImage({ priority = false }: Readonly<{ priority?: boolean }>) {
  return (
    <Image
      src="/logo-asr-how.png"
      alt="Material ASR HOW Brasil"
      width={168}
      height={99}
      priority={priority}
      className="h-auto w-36 sm:w-44"
    />
  );
}

export function BrandLogo({
  href = "/",
  priority = false,
  className = "",
}: BrandLogoProps) {
  if (!href) {
    return (
      <div className={className}>
        <LogoImage priority={priority} />
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`inline-flex w-fit items-center rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 ${className}`}
      aria-label="Ir para o início"
    >
      <LogoImage priority={priority} />
    </Link>
  );
}
