import type { Metadata } from 'next';
import { ContactLine, LegalPage } from '@/components/outly/legal-page';
import { runtimeValue } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Terms — Outly' };

export default function TermsPage() {
  const email = runtimeValue('PUBLIC_CONTACT_EMAIL');
  return <LegalPage eyebrow="Outly policy" title="Pilot terms" updated="8 September 2026">
    <section><h2>Pilot service</h2><p>Outly is an early-stage Delhi NCR group-planning service. It helps a group compare possible outings; it is not a venue, booking agent, transport provider or payment processor.</p></section>
    <section><h2>Check before booking</h2><p>Venue details, prices, opening hours, travel estimates and availability can change. Unknown prices are excluded from known-cost totals. Confirm all important details, dietary needs and refund terms with the venue or booking provider before paying or travelling.</p></section>
    <section><h2>Private links</h2><p>Anyone with a participant link can view the group’s shared planning state and participant nicknames. Keep organizer and participant edit links private. The organizer is responsible for sharing them with the intended group.</p></section>
    <section><h2>External services</h2><p>Google Maps and third-party booking or venue links are governed by their providers’ terms and policies. Outly does not control external inventory, checkout, cancellations, refunds or the accuracy of information displayed after you leave Outly.</p></section>
    <section><h2>Acceptable use</h2><p>Do not misuse the service, attempt to access another group without permission, overload the service, submit unlawful content or interfere with its security. Access may be limited during the pilot to protect users and service reliability.</p></section>
    <section><h2>Availability and liability</h2><p>The pilot is provided on an as-available basis and may change or stop. To the extent permitted by law, Outly is not responsible for losses caused by reliance on changing third-party information or by transactions with external providers. Nothing here limits rights that cannot legally be excluded.</p></section>
    <section><h2>Contact</h2><ContactLine email={email} /></section>
  </LegalPage>;
}
