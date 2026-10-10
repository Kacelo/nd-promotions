export type RegistrationStatus = 'pending' | 'paid' | 'confirmed' | 'cancelled';
export const STATUSES: RegistrationStatus[] = ['pending', 'paid', 'confirmed', 'cancelled'];

export type PaymentMethod = 'bank' | 'ewallet';

/** Namibian banks offering send-to-cellphone e-wallets. Admins tick the ones they accept. */
export const EWALLET_PROVIDERS = ['Bank Windhoek', 'FNB', 'Standard Bank', 'Nedbank', 'Letshego', 'Bank BIC'];

export interface EventRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  subtitle: string | null;
  event_date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM:SS
  end_time: string | null;
  venue: string | null;
  venue_note: string | null;
  about: string | null;
  about_highlight: string | null;
  hero_image_url: string | null;
  about_image_url: string | null;
  price: number;
  currency: string;
  inclusions: string[];
  capacity: number;
  rsvp_open: boolean;
  dress_code_title: string | null;
  dress_code_text: string | null;
  dress_palette: string[];
  payment_method: PaymentMethod;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  branch_code: string | null;
  payment_reference: string | null;
  ewallet_number: string | null;
  ewallet_name: string | null;
  ewallet_providers: string[];
  package_title: string | null;
  package_images: string[];
  custom_question: string | null;
  spaces_title: string | null;
  spaces_text: string | null;
  created_at: string;
}

export interface RegistrationRow {
  id: string;
  event_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  dietary: string | null;
  heard_from: string | null;
  looking_forward: string | null;
  custom_answer: string | null;
  proof_path: string;
  proof_mime: string;
  proof_filename: string | null;
  status: RegistrationStatus;
  admin_note: string | null;
  created_at: string;
}

export const HEARD_FROM_OPTIONS = [
  'Instagram',
  'WhatsApp',
  'Facebook',
  'TikTok',
  'A friend invited me',
  'I attended a previous event',
  'Other',
];
