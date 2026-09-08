import type { Metadata } from 'next';
import { ContactLine, LegalPage } from '@/components/outly/legal-page';
import { runtimeValue } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Privacy — Outly' };

export default function PrivacyPage() {
  const email = runtimeValue('PUBLIC_CONTACT_EMAIL');
  return <LegalPage eyebrow="Outly policy" title="Privacy" updated="8 September 2026">
    <section><h2>What Outly collects</h2><p>Outly stores an outing name, candidate dates, participant nicknames, submitted preferences, a starting place, generated plans, votes, final selections and optional usefulness feedback. It also keeps limited security counters needed to prevent abuse.</p></section>
    <section><h2>How it is used</h2><p>The information is used only to combine group constraints, find suitable Delhi NCR venues, estimate travel, present plans and understand whether the pilot is useful. Exact origins and individual budgets are not shown to other participants.</p></section>
    <section><h2>Service providers</h2><p>When live data is enabled, Google Maps Platform supplies location, venue, photo and route information. Outly may later use OpenAI only to rewrite verified structured facts into concise explanations; the recommendation rules continue to decide which plans qualify. External booking providers operate under their own policies once you follow a link.</p></section>
    <section><h2>Retention and deletion</h2><p>Private plan links expire after the group’s last proposed date plus 30 days. Exact origin information is then erased. Participants can delete their response from the device used to submit it, and organizers can delete the entire outing using the private organizer link. Security counters are removed after they expire.</p></section>
    <section><h2>What Outly does not do</h2><ul><li>No user accounts or saved preference profiles are included in this pilot.</li><li>Outly does not process bookings or payments.</li><li>Clicks on external booking links are not tracked.</li><li>Outly does not sell participant information.</li></ul></section>
    <section><h2>Contact</h2><ContactLine email={email} /></section>
  </LegalPage>;
}
