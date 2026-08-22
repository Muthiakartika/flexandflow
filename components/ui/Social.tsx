import { FOCUS } from "@/components/ui/tokens";
import { contact } from "@/lib/site";

/**
 * The three ways to reach the studio, as icons.
 *
 * These paths and the button around them started out inline in the Contact
 * page. The footer needed the same row, so they live here instead of being
 * copied — one set of glyphs, one set of hit areas, one focus ring.
 *
 * All three are drawn on a 24x24 grid and filled with `currentColor`, so the
 * colour comes from whatever the link is set to and hover only has to move one
 * value.
 */
/**
 * Three subpaths, and all three are load-bearing: the handset, the inner edge
 * of the speech bubble, and its outer edge. The version this replaced had only
 * the two bubble edges, so it drew an empty outlined blob — a shape nobody
 * recognises as WhatsApp. If this ever gets re-copied from somewhere, check the
 * handset survived.
 */
export const WHATSAPP_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.99 2.898 9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.9 11.9 0 0 0 5.688 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.82 11.82 0 0 0 20.464 3.488";

export const INSTAGRAM_PATH =
  "M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.336 3.608 1.311.975.975 1.249 2.242 1.311 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.336 2.633-1.311 3.608-.975.975-2.242 1.249-3.608 1.311-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.336-3.608-1.311-.975-.975-1.249-2.242-1.311-3.608C2.175 15.586 2.163 15.206 2.163 12s.012-3.584.07-4.85c.062-1.366.336-2.633 1.311-3.608C4.519 2.567 5.786 2.293 7.152 2.231 8.418 2.175 8.796 2.163 12 2.163m0-2.163C8.741 0 8.332.014 7.052.072 5.197.157 3.355.673 2.014 2.014.673 3.355.157 5.197.072 7.052.014 8.332 0 8.741 0 12s.014 3.668.072 4.948c.085 1.855.601 3.697 1.942 5.038 1.341 1.341 3.183 1.857 5.038 1.942C8.332 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.855-.085 3.697-.601 5.038-1.942 1.341-1.341 1.857-3.183 1.942-5.038.058-1.28.072-1.689.072-4.948s-.014-3.668-.072-4.948c-.085-1.855-.601-3.697-1.942-5.038C20.645.673 18.803.157 16.948.072 15.668.014 15.259 0 12 0m0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324M12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8";

export type SocialItem = {
  label: string;
  href: string;
  path: string;
};

/** The studio's two profiles. Phone and e-mail are reached from the columns
 *  above the footer bar and from the Contact page, not from here. */
export const socialLinks: SocialItem[] = [
  { label: "WhatsApp", href: contact.whatsapp, path: WHATSAPP_PATH },
  { label: "Instagram", href: contact.instagram, path: INSTAGRAM_PATH },
];

/**
 * `button` sits inside a card on the Contact page, where an outlined disc
 * matches the other controls around it. `bare` is the footer bar: the glyph
 * alone, in the brand olive, with nothing drawn around it.
 *
 * Bare is 14px, the bottom of the range this footer wants. It is not smaller
 * than that because 14 is where the handset inside the WhatsApp bubble stops
 * resolving — at 12 it is a smudge and at 10 the mark reads as a plain blob,
 * which is the failure this glyph was just fixed for.
 *
 * Bare still carries `p-2.5`, pulled back out with `-m-2.5` so it changes
 * nothing visually. That padding is the tap target: 14px of glyph is a third of
 * what a thumb needs, and the negative margin means the row still lines up on
 * the glyph edges, so dropping the border did not have to cost the hit area.
 */
export type SocialVariant = "button" | "bare";

/**
 * `aria-label` is the only name these links have, since the glyph is hidden
 * from assistive tech.
 */
export function Social({
  href,
  path,
  label,
  variant = "button",
}: SocialItem & { variant?: SocialVariant }) {
  const bare = variant === "bare";

  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className={
        bare
          ? `-m-2.5 inline-flex p-2.5 text-primary transition-colors duration-300 hover:text-primary-strong ${FOCUS}`
          : `flex h-10 w-10 items-center justify-center rounded-full border border-secondary/20 text-secondary transition-colors duration-300 hover:border-primary hover:text-primary ${FOCUS}`
      }
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className={bare ? "h-3.5 w-3.5" : "h-4 w-4"}
        fill="currentColor"
      >
        <path d={path} />
      </svg>
    </a>
  );
}
