-- Optional: creates the first event (HER ERA, 14 Nov 2026).
-- Run after schema.sql. Everything here can be edited later in /admin.
insert into public.events (
  slug, name, tagline, subtitle, event_date, start_time, end_time,
  venue, venue_note, about, about_highlight, price, currency, inclusions,
  capacity, rsvp_open, dress_code_title, dress_code_text, dress_palette,
  bank_name, account_name, account_number, payment_reference, custom_question
) values (
  'her-era',
  'HER ERA',
  'A more intentional you.',
  'Because we never stop becoming.',
  '2026-11-14', '14:00', '18:00',
  'Windhoek, Namibia',
  'Venue details shared upon confirmation.',
  E'HER ERA is a space for women to pause, meet themselves where they are, and reflect on who they’re becoming.

You don’t have to have everything figured out. Sometimes, the woman you’re becoming isn’t as far away as you think.

It’s about understanding the woman you are today, giving yourself grace for what you’re still figuring out, honouring how far you’ve come, and becoming more intentional about where you’re going.

Different ages. Different stages. Different seasons. One table.',
  E'Different ages.\nDifferent stages.\nDifferent seasons.\nOne table.',
  400, 'N$',
  array['HER ERA journal + pen', 'Food + refreshments', 'The HER ERA experience', 'Entry to HER ERA'],
  25, true,
  'Soft Neutrals & Rich Tones',
  'Think: cream, beige, chocolate, blush, mauve, burgundy, olive, black and soft earthy tones. Come as you are. Just make it intentional.',
  array['#efe4da', '#d9c3b0', '#d8aaa4', '#a8877c', '#615a48', '#4a2c22'],
  '[BANK NAME]', '[ACCOUNT NAME]', '[ACCOUNT NUMBER]', 'Your full name',
  'What are you currently becoming?'
) on conflict (slug) do nothing;
