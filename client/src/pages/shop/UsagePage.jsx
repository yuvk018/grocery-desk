// UsagePage.jsx - "Assistant usage": how the LLM is doing (LLM usage-log stretch goal).
// Shows totals (calls, success rate, average time, tokens) and the latest calls with their errors.

import { useEffect, useState } from 'react';

import { api } from '../../api/client.js';
import { card, heading } from '../../components/ui.js';

const timeFormat = { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', second: '2-digit' };

// Gemini errors arrive as long JSON text. Pull out the readable part and keep it short.
function shortError(error) {
  if (!error) return '';
  let text = error;
  try {
    text = JSON.parse(error).error?.message ?? error;
  } catch {
    // not JSON: use as is
  }
  text = text.split('\n')[0];
  return text.length > 110 ? `${text.slice(0, 110)}…` : text;
}

const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`;
const thousands = (n) => n.toLocaleString('en-IN');

export default function UsagePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/llm-logs/summary').then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>;
  if (!data) return <p className="py-10 text-center text-muted">Loading…</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className={heading}>Assistant usage</h1>
        <p className="mt-1 text-sm text-muted">Every message sent to the AI assistant, how long it took and whether we could use the answer.</p>
      </div>

      <dl className="tabular mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
        <Tile label="Messages read" value={thousands(data.calls)} />
        <Tile
          label="Understood"
          value={`${data.successRate}%`}
          sub={data.failures ? `${data.failures} fell back to manual` : 'no failures'}
          tone={data.calls && data.successRate < 80 ? 'warn' : 'brand'}
        />
        <Tile label="Average time" value={seconds(data.avgDurationMs)} />
        <Tile label="Tokens used" value={thousands(data.inputTokens + data.outputTokens)} sub={`${thousands(data.inputTokens)} in · ${thousands(data.outputTokens)} out`} />
      </dl>

      <h2 className="mb-3 text-base font-semibold">Latest messages</h2>
      {data.recent.length === 0 && <p className={`${card} px-4 py-10 text-center text-muted`}>No messages yet.</p>}

      <ul className={`${card} divide-y divide-line ${data.recent.length ? '' : 'hidden'}`}>
        {data.recent.map((log) => (
          <li key={log._id} className="grid gap-x-6 gap-y-1 px-4 py-3 text-sm sm:px-5 md:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <p className="truncate">“{log.message}”</p>
              {log.success ? (
                <p className="text-xs text-brand">Understood</p>
              ) : (
                <p className="text-xs text-danger">Failed: {shortError(log.error)}</p>
              )}
            </div>
            <div className="tabular flex gap-4 text-xs text-muted md:justify-end md:text-right">
              <span>{new Date(log.createdAt).toLocaleString('en-IN', timeFormat)}</span>
              <span className="w-12">{seconds(log.durationMs)}</span>
              <span className="w-20">{log.inputTokens + log.outputTokens ? `${thousands(log.inputTokens + log.outputTokens)} tokens` : '—'}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tile({ label, value, sub, tone }) {
  return (
    <div className="bg-surface px-4 py-4 sm:px-5">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</dt>
      <dd className={`mt-1 text-2xl font-semibold ${tone === 'warn' ? 'text-warn' : tone === 'brand' ? 'text-brand' : ''}`}>{value}</dd>
      {sub && <dd className="mt-0.5 text-xs text-muted">{sub}</dd>}
    </div>
  );
}
