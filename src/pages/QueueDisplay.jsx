import { useState, useEffect, useCallback, useMemo } from 'react';
import { queueTicketsApi } from '../api/services';
import { formatAxiosError } from '../utils/apiError';
import './QueueDisplay.css';

const POLL_MS = 15_000;

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function extractList(data) {
  if (Array.isArray(data)) return data;
  return data?.results ?? data?.data ?? data?.items ?? [];
}

function getPatientName(t) {
  const p = t.patient;
  if (p && typeof p === 'object') return p.full_name ?? p.name ?? '—';
  return t.patient_name ?? '—';
}

function getDentistName(t) {
  const d = t.dentist;
  if (d && typeof d === 'object') return d.name ?? d.full_name ?? '';
  return t.dentist_name ?? '';
}

/** Room label: API room field if present, else dentist name (clinic may name dentists as rooms). */
function getRoomLabel(t) {
  const explicit = t.room ?? t.room_name ?? t.room_label ?? t.operatory;
  if (explicit != null && String(explicit).trim() !== '') return String(explicit).trim();
  const dent = getDentistName(t);
  return dent || '—';
}

function formatQueueNumber(t) {
  const n = t.ticket_number ?? t.ticketNumber;
  if (n == null || n === '') return '—';
  const raw = String(n).trim();
  if (/^Q\d+/i.test(raw)) return raw.toUpperCase().replace(/^q/, 'Q');
  const num = parseInt(raw, 10);
  if (!Number.isNaN(num)) return `Q${String(num).padStart(3, '0')}`;
  return `Q${raw}`;
}

function statusNorm(s) {
  return (s ?? '').toLowerCase();
}

export default function QueueDisplay() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await queueTicketsApi.getAll({
        limit: 300,
        ordering: 'ticket_number',
        queue_date: todayISODate(),
      });
      const list = extractList(res.data);
      setTickets(Array.isArray(list) ? list : []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(formatAxiosError(err, 'Could not load queue.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const { nowServing, waiting } = useMemo(() => {
    const sortNum = (a, b) => {
      const na = Number(a.ticket_number ?? a.ticketNumber ?? 0);
      const nb = Number(b.ticket_number ?? b.ticketNumber ?? 0);
      return (Number.isNaN(na) ? 0 : na) - (Number.isNaN(nb) ? 0 : nb);
    };

    const active = tickets.filter((t) => {
      const st = statusNorm(t.status);
      return st === 'called' || st === 'in_treatment';
    });
    active.sort(sortNum);

    const wait = tickets.filter((t) => statusNorm(t.status) === 'waiting');
    wait.sort(sortNum);

    return { nowServing: active, waiting: wait };
  }, [tickets]);

  const timeLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  return (
    <div className="queue-display">
      <header className="queue-display__banner">
        <div className="queue-display__rule" aria-hidden />
        <h1 className="queue-display__title">Dental clinic queue</h1>
        <div className="queue-display__rule" aria-hidden />
      </header>

      <p className="queue-display__meta">
        {loading && !lastUpdated ? 'Loading…' : `Today · ${todayISODate()}`}
        <span className="queue-display__meta-sep">·</span>
        Auto-refresh every {POLL_MS / 1000}s
        <span className="queue-display__meta-sep">·</span>
        Last update {timeLabel}
      </p>

      {error && (
        <div className="queue-display__error" role="alert">
          {error}
        </div>
      )}

      <section className="queue-display__section" aria-labelledby="now-serving-heading">
        <h2 id="now-serving-heading" className="queue-display__section-title">
          Now serving
        </h2>
        <div className="queue-display__table-wrap">
          <table className="queue-display__table">
            <thead>
              <tr>
                <th scope="col">Ticket</th>
                <th scope="col">Patient</th>
                <th scope="col">Room</th>
              </tr>
            </thead>
            <tbody>
              {nowServing.length === 0 ? (
                <tr>
                  <td colSpan={3} className="queue-display__empty-cell">
                    No patients are being called right now.
                  </td>
                </tr>
              ) : (
                nowServing.map((t) => {
                  const id = t.id ?? t.pk ?? formatQueueNumber(t);
                  return (
                    <tr key={id}>
                      <td className="queue-display__ticket">{formatQueueNumber(t)}</td>
                      <td className="queue-display__name">{getPatientName(t)}</td>
                      <td className="queue-display__room">{getRoomLabel(t)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="queue-display__divider" aria-hidden />

      <section className="queue-display__section queue-display__section--waiting" aria-labelledby="waiting-heading">
        <h2 id="waiting-heading" className="queue-display__section-title">
          Waiting
        </h2>
        {waiting.length === 0 ? (
          <p className="queue-display__waiting-empty">No tickets waiting.</p>
        ) : (
          <ul className="queue-display__waiting-list">
            {waiting.map((t) => {
              const id = t.id ?? t.pk ?? formatQueueNumber(t);
              return (
                <li key={id} className="queue-display__waiting-item">
                  {formatQueueNumber(t)}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="queue-display__divider queue-display__divider--bottom" aria-hidden />
    </div>
  );
}
