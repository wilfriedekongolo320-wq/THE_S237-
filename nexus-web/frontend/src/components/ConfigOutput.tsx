import type { ProtocolType } from '@/lib/types';

interface ConfigOutputProps {
  config: string;
  protocol: ProtocolType;
}

export default function ConfigOutput({ config, protocol }: ConfigOutputProps) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-display font-semibold text-foreground">Configuration {protocol.toUpperCase()}</h3>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-primary">
          prêt à copier
        </span>
      </div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-950/80 p-3 text-xs text-slate-200">
        {config || 'Aucune configuration disponible.'}
      </pre>
    </div>
  );
}
