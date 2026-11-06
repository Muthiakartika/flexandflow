/**
 * The treatments' everyday names, in the order the studio lists them.
 *
 * The panel titles carry search words ("Assisted Stretching Bali",
 * "Pregnancy Massage Service") that read badly in a list or a menu, so lists
 * built in code name each treatment this way. The order is the home service
 * page's, with trauma healing, which stays at the studio, last.
 */
export const TREATMENT_NAMES: Record<string, string> = {
  "sport-massage": "Sports massage",
  "lymphatic-drainage": "Lymphatic drainage",
  "lymphatic-detox-massage-for-men": "Men's lymphatic detox",
  "pregnancy-massage-service": "Pregnancy massage",
  "assisted-stretching": "Assisted stretching",
  "cupping-therapy": "Cupping",
  "trauma-healing": "Trauma healing",
};

export const TREATMENT_ORDER = Object.keys(TREATMENT_NAMES);
