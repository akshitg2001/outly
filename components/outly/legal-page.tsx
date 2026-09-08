import { SiteHeader } from './site-header';

export function LegalPage({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated: string; children: React.ReactNode }) {
  return <main className="min-h-screen bg-background text-foreground"><SiteHeader context="Pilot policies" /><article className="mx-auto max-w-3xl px-5 py-12 lg:px-8 lg:py-16"><p className="eyebrow">{eyebrow}</p><h1 className="mt-2 font-heading text-5xl font-semibold tracking-[-0.045em]">{title}</h1><p className="mt-3 text-sm text-muted-foreground">Last updated {updated}</p><div className="mt-10 space-y-8 text-[15px] leading-7 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-semibold [&_p]:mt-2 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">{children}</div></article></main>;
}

export function ContactLine({ email }: { email?: string }) {
  return email ? <p>Questions or deletion requests can be sent to <a className="font-semibold underline decoration-signal decoration-2 underline-offset-4" href={`mailto:${email}`}>{email}</a>.</p> : <p>Contact details will be published before the controlled pilot opens.</p>;
}
