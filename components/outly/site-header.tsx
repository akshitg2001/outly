import { ArrowLeft } from 'lucide-react';

export function SiteHeader({ backHref, context = 'Delhi NCR pilot' }: { backHref?: string; context?: string }) {
  return (
    <header className="border-b-2 border-foreground bg-background">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 lg:px-8">
        <div className="flex items-center gap-4">
          {backHref && <a href={backHref} aria-label="Go back" className="grid size-9 place-items-center border border-foreground transition hover:bg-foreground hover:text-background"><ArrowLeft className="size-4" /></a>}
          <a href="/" className="font-heading text-2xl font-bold uppercase tracking-[-0.04em]">Outly<span className="text-signal">.</span></a>
        </div>
        <div className="flex items-center gap-3 text-sm"><span className="hidden text-muted-foreground sm:inline">{context}</span><span className="border border-foreground px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em]">Private beta</span></div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return <footer className="border-t-2 border-foreground bg-background"><div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-3 px-5 py-6 text-sm text-muted-foreground sm:flex-row lg:px-8"><p>Outly Delhi NCR pilot</p><nav aria-label="Legal" className="flex gap-5"><a className="underline underline-offset-4 hover:text-foreground" href="/privacy">Privacy</a><a className="underline underline-offset-4 hover:text-foreground" href="/terms">Terms</a></nav></div></footer>;
}

export function LoadingPanel({ label = 'Loading the group plan…' }: { label?: string }) {
  return <div className="grid min-h-[55vh] place-items-center px-5 text-center"><div><span className="mx-auto block size-8 animate-spin border-2 border-foreground border-t-signal" /><p className="mt-4 font-medium">{label}</p></div></div>;
}

export function ErrorPanel({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="mx-auto max-w-xl px-5 py-20 text-center"><p className="eyebrow">Couldn’t continue</p><h1 className="mt-3 font-heading text-4xl font-semibold">This plan hit a roadblock.</h1><p className="mt-4 text-muted-foreground">{message}</p>{retry && <button onClick={retry} className="mt-7 border border-foreground bg-foreground px-5 py-3 font-semibold text-background">Try again</button>}</div>;
}
