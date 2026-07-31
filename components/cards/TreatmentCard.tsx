import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import type { Service } from "@/types";

/**
 * Home page treatment card: a photo with the theme's wavy bottom edge, the
 * service name, and a "More Info" button through to the detail page.
 */
export default function TreatmentCard({ service }: { service: Service }) {
  const href = `/uluwatu-bali/${service.slug}`;

  return (
    <article className="group p-[10px] text-center">
      <Link href={href} className="block" tabIndex={-1} aria-hidden>
        <div className="wave-edge">
          <Image
            src={service.image}
            alt={service.title}
            width={1300}
            height={1200}
            sizes="(max-width: 767px) 90vw, (max-width: 1280px) 45vw, 30vw"
            className="h-[414px] w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-105 max-[1280px]:h-[330px] max-[767px]:h-[290px]"
          />
        </div>
      </Link>

      <h3 className="mt-6 text-[var(--fs-h3)]">
        <Link
          href={href}
          className="transition-colors duration-300 hover:text-primary"
        >
          {service.title}
        </Link>
      </h3>

      <div className="mt-6 flex justify-center">
        <ButtonLink href={href}>More Info</ButtonLink>
      </div>
    </article>
  );
}
