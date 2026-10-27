/** Public site details shared by the landing page and the legal pages. */
export const SITE = {
  name: 'Mediqo',
  tagline: 'Find trusted doctors near you and book in seconds',
  // Shown on Terms / Privacy and in the footer; set NEXT_PUBLIC_CONTACT_EMAIL on Vercel
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'contact@markeltree.com',
  // Google Play listing; until it is set the site shows "Coming soon on Google Play"
  playStoreUrl: process.env.NEXT_PUBLIC_PLAY_STORE_URL || '',
  // Date the current Terms and Privacy Policy took effect
  legalUpdated: '27 October 2026',
  country: 'Pakistan',
};
