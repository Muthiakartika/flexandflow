"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

import NewsletterForm from "./NewsletterForm";
import { contact, slideMenuServices, workingHours } from "@/lib/site";

/**
 * The 6-dot trigger in the header opens the theme's off-canvas panel: the
 * services list with thumbnails, contact info, working hours, and the
 * newsletter sign-up. Desktop only, as on the original.
 */
export default function SlideMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Open menu"
        className="flex h-[50px] w-[50px] items-center justify-center text-secondary transition-colors duration-300 hover:text-primary"
      >
        {/* Four outlined circles in a diamond, matching the theme's trigger. */}
        <span
          aria-hidden
          className="block h-[50px] w-[50px] bg-current"
          style={{
            maskImage: "url('/shapes/slide-menu-trigger.svg')",
            WebkitMaskImage: "url('/shapes/slide-menu-trigger.svg')",
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
          }}
        />
      </button>

      <div
        onClick={close}
        aria-hidden
        className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
      />

      <div
        id={panelId}
        role="dialog"
        aria-modal={open}
        aria-label="Services and contact"
        className="fixed top-0 right-0 z-50 flex h-full w-[420px] max-w-[90vw] flex-col gap-8 overflow-y-auto bg-cream px-8 py-10"
        style={{
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 350ms ease-in-out",
        }}
      >
        <button
          type="button"
          onClick={close}
          className="self-end font-body text-[14px] tracking-wide text-body-text uppercase transition-colors duration-300 hover:text-primary"
        >
          Close
        </button>

        <section>
          <h4 className="text-[var(--fs-h4)] text-primary">Our Services</h4>
          <ul className="mt-5 flex flex-col gap-4">
            {slideMenuServices.map((service) => (
              <li key={service.label}>
                <Link
                  href={service.href}
                  onClick={close}
                  className="group flex items-center gap-4"
                >
                  <Image
                    src={service.image}
                    alt={service.label}
                    width={200}
                    height={125}
                    sizes="80px"
                    className="h-[50px] w-[80px] shrink-0 rounded-[var(--radius-1x)] object-cover"
                  />
                  <h5 className="text-[22px] leading-tight transition-colors duration-300 group-hover:text-primary">
                    {service.label}
                  </h5>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className="text-[var(--fs-h4)] text-primary">Contact Info</h4>
          <div className="mt-4 flex flex-col gap-2 text-[16px] leading-[1.625]">
            <p>Address : {contact.address}</p>
            <p>
              Email :{" "}
              <a href={`mailto:${contact.email}`} className="hover:text-primary">
                {contact.email}
              </a>
            </p>
            <p>
              Phone :{" "}
              <a href={contact.phoneHref} className="hover:text-primary">
                {contact.phone}
              </a>
            </p>
            <p className="flex flex-wrap items-center gap-3">
              <span>Social :</span>
              <a
                href={contact.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary"
              >
                Whatsapp
              </a>
              <a
                href={contact.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary"
              >
                Instagram
              </a>
            </p>
          </div>
        </section>

        <section>
          <h4 className="text-[var(--fs-h4)] text-primary">Working Hours</h4>
          {workingHours.map((slot) => (
            <p key={slot.days} className="mt-3 text-[16px]">
              {slot.days} : {slot.hours}
            </p>
          ))}
        </section>

        <section>
          <h4 className="text-[var(--fs-h4)] text-primary">Join Our Newsletter</h4>
          <NewsletterForm />
        </section>
      </div>
    </>
  );
}
