import { useState, useEffect, useCallback, useMemo } from 'react';
import { queueTicketsApi, patientsApi, dentistsApi } from '../api/services';
import SearchableSelect from '../components/SearchableSelect';
import QuickPatientForm from '../components/QuickPatientForm';
import { formatAxiosError } from '../utils/apiError';
import './Queue.css';

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
  if (d && typeof d === 'object') return d.name ?? d.full_name ?? '—';
  return t.dentist_name ?? '—';
}

function getDentistId(t) {
  const d = t.dentist;
  if (d && typeof d === 'object') return d.id ?? d.pk;
  return t.dentist_id ?? t.dentist ?? null;
}

function statusLabel(s) {
  const x = (s ?? '').toLowerCase();
  const map = {
    waiting: 'Waiting',
    called: 'Called',
    in_treatment: 'In treatment',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No-show',
  };
  return map[x] ?? (s || '—');
}

function validNextStatuses(s) {
  const x = (s ?? '').toLowerCase();
  if (x === 'waiting') return ['called', 'cancelled', 'no_show'];
  if (x === 'called') return ['in_treatment', 'cancelled', 'no_show'];
  if (x === 'in_treatment') return ['completed', 'cancelled'];
  return [];
}

function isTerminal(s) {
  const x = (s ?? '').toLowerCase();
  return ['completed', 'cancelled', 'no_show'].includes(x);
}

function needsDentistForStatus(status) {
  return ['called', 'in_treatment', 'completed'].includes((status ?? '').toLowerCase());
}

function formatTs(val) {
  if (val == null || val === '') return '—';
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? String(val) : d.toLocaleString();
}

export default function Queue() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [queueDate, setQueueDate] = useState(todayISODate);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPatient, setFilterPatient] = useState('');
  const [filterDentist, setFilterDentist] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [patchingId, setPatchingId] = useState(null);
  const [dentistModal, setDentistModal] = useState(null);
  const [dentistChoice, setDentistChoice] = useState('');

  const [patientOptions, setPatientOptions] = useState([]);
  const [dentistOptions, setDentistOptions] = useState([]);

  const [createForm, setCreateForm] = useState({
    patient: '',
    queue_date: todayISODate(),
    appointment: '',
    notes: '',
  });

  const [showQuickPatient, setShowQuickPatient] = useState(false);
  const [quickPatientFormKey, setQuickPatientFormKey] = useState(0);
  const [quickPatientError, setQuickPatientError] = useState('');
  const [creatingPatient, setCreatingPatient] = useState(false);

  const loadPatientOptions = useCallback(async () => {
    try {
      const pr = await patientsApi.getAll({ limit: 500, ordering: '-id' });
      const pl = extractList(pr.data);
      setPatientOptions(
        (Array.isArray(pl) ? pl : [])
          .map((p) => ({
            value: p.id ?? p.pk,
            label: `${p.full_name ?? p.name ?? `#${p.id}`}${p.phone ? ` · ${p.phone}` : ''}`,
          }))
          .filter((o) => o.value != null)
      );
    } catch {
      setPatientOptions([]);
    }
  }, []);

  const loadDentistOptions = useCallback(async () => {
    try {
      const dr = await dentistsApi.getAll({ limit: 200 });
      const dl = extractList(dr.data);
      setDentistOptions(
        (Array.isArray(dl) ? dl : [])
          .map((d) => ({
            value: d.id ?? d.pk,
            label: d.name ?? d.full_name ?? `#${d.id}`,
          }))
          .filter((o) => o.value != null)
      );
    } catch {
      setDentistOptions([]);
    }
  }, []);

  const fetchTickets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = {
        limit: 200,
        ordering: 'ticket_number',
        queue_date: queueDate,
      };
      if (filterStatus) params.status = filterStatus;
      if (filterPatient) params.patient = filterPatient;
      if (filterDentist) params.dentist = filterDentist;
      if (searchApplied.trim()) params.search = searchApplied.trim();
      const res = await queueTicketsApi.getAll(params);
      setTickets(extractList(res.data));
    } catch (err) {
      setError(formatAxiosError(err, 'Failed to load queue.'));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [queueDate, filterStatus, filterPatient, filterDentist, searchApplied]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    loadPatientOptions();
    loadDentistOptions();
  }, [loadPatientOptions, loadDentistOptions]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchApplied(searchInput.trim());
  };

  const openDentistModal = (payload) => {
    setActionError(null);
    setDentistModal(payload);
    setDentistChoice(
      payload.mode === 'callNext' && filterDentist
        ? String(filterDentist)
        : payload.existingDentist
          ? String(payload.existingDentist)
          : ''
    );
  };

  const closeDentistModal = () => {
    setDentistModal(null);
    setDentistChoice('');
  };

  const handleDentistModalConfirm = async () => {
    const dent = Number(dentistChoice);
    if (!dentistChoice || Number.isNaN(dent)) {
      setActionError('Select a dentist.');
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      if (dentistModal.mode === 'callNext') {
        await queueTicketsApi.callNext({ dentist: dent, queue_date: queueDate });
      } else {
        const { ticketId, nextStatus } = dentistModal;
        await queueTicketsApi.patch(ticketId, { status: nextStatus, dentist: dent });
      }
      closeDentistModal();
      await fetchTickets(true);
    } catch (err) {
      setActionError(formatAxiosError(err, 'Request failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  const patchTicketStatus = async (ticket, nextStatus) => {
    const id = ticket.id ?? ticket.pk;
    if (id == null) return;

    if (nextStatus === 'cancelled' || nextStatus === 'no_show') {
      setPatchingId(id);
      setActionError(null);
      try {
        await queueTicketsApi.patch(id, { status: nextStatus });
        await fetchTickets(true);
      } catch (err) {
        setActionError(formatAxiosError(err, 'Update failed.'));
      } finally {
        setPatchingId(null);
      }
      return;
    }

    const needDent = needsDentistForStatus(nextStatus);
    const existing = getDentistId(ticket);
    if (needDent && !existing) {
      openDentistModal({ mode: 'patch', ticketId: id, nextStatus });
      return;
    }

    setPatchingId(id);
    setActionError(null);
    try {
      const payload = { status: nextStatus };
      if (needDent && existing) payload.dentist = existing;
      await queueTicketsApi.patch(id, payload);
      await fetchTickets(true);
    } catch (err) {
      setActionError(formatAxiosError(err, 'Update failed.'));
    } finally {
      setPatchingId(null);
    }
  };

  const handleCallNextClick = () => {
    openDentistModal({ mode: 'callNext' });
  };

  const openCreateModal = () => {
    setActionError(null);
    setQuickPatientError('');
    setShowQuickPatient(false);
    setQuickPatientFormKey((k) => k + 1);
    setCreateForm({
      patient: '',
      queue_date: todayISODate(),
      appointment: '',
      notes: '',
    });
    setShowCreate(true);
  };

  const closeCreateModal = () => {
    setShowCreate(false);
    setShowQuickPatient(false);
    setQuickPatientError('');
  };

  const handleQuickPatientPayload = async (payload) => {
    setCreatingPatient(true);
    setQuickPatientError('');
    try {
      const res = await patientsApi.create({ ...payload, status: 'active' });
      const created = res?.data;
      const newId = created?.id ?? created?.pk;
      if (newId == null) {
        setQuickPatientError('Patient was created but the response had no id. Refresh the page and search.');
        await loadPatientOptions();
        return;
      }
      await loadPatientOptions();
      setCreateForm((f) => ({ ...f, patient: String(newId) }));
      setShowQuickPatient(false);
    } catch (err) {
      setQuickPatientError(formatAxiosError(err, 'Could not create patient.'));
    } finally {
      setCreatingPatient(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.patient) {
      setActionError('Select a patient.');
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      const body = {
        patient: Number(createForm.patient),
        queue_date: createForm.queue_date || queueDate,
      };
      if (createForm.appointment.trim()) {
        const ap = Number(createForm.appointment);
        if (!Number.isNaN(ap)) body.appointment = ap;
      }
      if (createForm.notes.trim()) body.notes = createForm.notes.trim();
      await queueTicketsApi.create(body);
      closeCreateModal();
      await fetchTickets(true);
    } catch (err) {
      setActionError(formatAxiosError(err, 'Could not create ticket.'));
    } finally {
      setSubmitting(false);
    }
  };

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'All statuses' },
      { value: 'waiting', label: 'Waiting' },
      { value: 'called', label: 'Called' },
      { value: 'in_treatment', label: 'In treatment' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'no_show', label: 'No-show' },
    ],
    []
  );

  return (
    <div className="queue-page">
      <div className="page-header">
        <h1>Clinic queue</h1>
        <div className="page-header-actions">
          <button type="button" className="btn-queue-call-next" onClick={handleCallNextClick}>
            Call next
          </button>
          <button type="button" className="btn-add" onClick={openCreateModal}>
            New ticket
          </button>
        </div>
      </div>

      <p className="queue-intro">
        Reception adds patients to the queue; dentists use <strong>Call next</strong> or row actions to move tickets through
        waiting → called → in treatment → completed.
      </p>

      {error && <div className="page-error">{error}</div>}
      {actionError && !dentistModal && !showCreate && <div className="page-error">{actionError}</div>}

      <form className="queue-filters" onSubmit={handleSearch}>
        <div className="queue-filter">
          <label htmlFor="queue-date">Queue day</label>
          <input
            id="queue-date"
            type="date"
            value={queueDate}
            onChange={(e) => setQueueDate(e.target.value)}
          />
        </div>
        <div className="queue-filter">
          <label htmlFor="queue-status">Status</label>
          <select
            id="queue-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {statusOptions.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="queue-filter queue-filter--wide">
          <label htmlFor="queue-patient">Patient</label>
          <SearchableSelect
            id="queue-patient"
            name="patient"
            value={filterPatient}
            onChange={(e) => setFilterPatient(e.target.value)}
            options={patientOptions}
            emptyOptionLabel="All patients"
            searchPlaceholder="Search patients…"
          />
        </div>
        <div className="queue-filter queue-filter--wide">
          <label htmlFor="queue-dentist">Dentist</label>
          <SearchableSelect
            id="queue-dentist"
            name="dentist"
            value={filterDentist}
            onChange={(e) => setFilterDentist(e.target.value)}
            options={dentistOptions}
            emptyOptionLabel="All dentists"
            searchPlaceholder="Search dentists…"
          />
        </div>
        <div className="queue-filter queue-filter--grow">
          <label htmlFor="queue-search">Search</label>
          <input
            id="queue-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Name, notes…"
            autoComplete="off"
          />
        </div>
        <button type="submit" className="btn-queue-apply">
          Apply
        </button>
      </form>

      {dentistModal && (
        <div
          className="queue-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dentist-modal-title"
          onClick={closeDentistModal}
        >
          <div className="queue-modal" onClick={(ev) => ev.stopPropagation()}>
            <h2 id="dentist-modal-title">{dentistModal.mode === 'callNext' ? 'Call next patient' : 'Select dentist'}</h2>
            <p className="queue-modal-hint">
              {dentistModal.mode === 'callNext'
                ? 'Assigns the next waiting ticket to “called” for this dentist.'
                : `Set dentist for status “${statusLabel(dentistModal.nextStatus)}”.`}
            </p>
            {actionError && <div className="queue-modal-error">{actionError}</div>}
            <div className="queue-modal-field">
              <label htmlFor="modal-dentist">Dentist</label>
              <SearchableSelect
                id="modal-dentist"
                name="dentist"
                value={dentistChoice}
                onChange={(e) => setDentistChoice(e.target.value)}
                options={dentistOptions}
                emptyOptionLabel="Select dentist"
                searchPlaceholder="Search dentists…"
              />
            </div>
            <div className="queue-modal-actions">
              <button type="button" className="queue-modal-cancel" onClick={closeDentistModal}>
                Cancel
              </button>
              <button type="button" className="queue-modal-confirm" disabled={submitting} onClick={handleDentistModalConfirm}>
                {submitting ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="queue-form-modal" role="dialog" aria-labelledby="new-ticket-title">
          <div className="queue-form-panel">
            <h2 id="new-ticket-title">New queue ticket</h2>
            {actionError && (
              <div className="queue-form-panel-error" role="alert">
                {actionError}
              </div>
            )}
            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label htmlFor="nt-patient">Patient *</label>
                <SearchableSelect
                  id="nt-patient"
                  name="patient"
                  value={createForm.patient}
                  onChange={(e) => setCreateForm((f) => ({ ...f, patient: e.target.value }))}
                  options={patientOptions}
                  emptyOptionLabel="Select patient"
                  searchPlaceholder="Search patients…"
                  required
                  dropdownActions={[
                    {
                      label: '+ Quick create patient',
                      className: 'searchable-select-action--quick',
                      onClick: () => {
                        setQuickPatientError('');
                        setQuickPatientFormKey((k) => k + 1);
                        setShowQuickPatient(true);
                      },
                    },
                  ]}
                />
              </div>
              {showQuickPatient && (
                <div className="queue-quick-patient" onClick={(e) => e.stopPropagation()}>
                  <QuickPatientForm
                    idPrefix="queue-qp"
                    resetKey={quickPatientFormKey}
                    useFormElement={false}
                    error={quickPatientError}
                    submitting={creatingPatient}
                    disabled={submitting}
                    onSubmit={handleQuickPatientPayload}
                    submitLabel="Create & select"
                    onCancel={() => {
                      setShowQuickPatient(false);
                      setQuickPatientError('');
                    }}
                  />
                </div>
              )}
              <div className="form-group">
                <label htmlFor="nt-date">Queue day</label>
                <input
                  id="nt-date"
                  type="date"
                  value={createForm.queue_date}
                  onChange={(e) => setCreateForm((f) => ({ ...f, queue_date: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="nt-appt">Appointment ID (optional)</label>
                <input
                  id="nt-appt"
                  type="number"
                  min={1}
                  value={createForm.appointment}
                  onChange={(e) => setCreateForm((f) => ({ ...f, appointment: e.target.value }))}
                  placeholder="Link to existing appointment"
                />
              </div>
              <div className="form-group">
                <label htmlFor="nt-notes">Notes</label>
                <textarea
                  id="nt-notes"
                  rows={3}
                  value={createForm.notes}
                  onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes for reception"
                />
              </div>
              <div className="queue-form-actions">
                <button type="button" className="btn-secondary" onClick={closeCreateModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-add" disabled={submitting || creatingPatient}>
                  {submitting ? 'Saving…' : 'Register ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <p className="queue-loading">Loading queue…</p>
      ) : (
        <div className="queue-table-wrap">
          <table className="queue-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Patient</th>
                <th>Status</th>
                <th>Dentist</th>
                <th>Registered</th>
                <th>Called</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="queue-empty">
                    No tickets for this day. Add a ticket or change filters.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => {
                  const id = t.id ?? t.pk;
                  const st = t.status ?? '';
                  const busy = patchingId === id;
                  const next = validNextStatuses(st);
                  const terminal = isTerminal(st);
                  return (
                    <tr key={id}>
                      <td className="queue-td-num">{t.ticket_number ?? '—'}</td>
                      <td>{getPatientName(t)}</td>
                      <td>
                        <span className={`queue-status queue-status--${(st || 'unknown').toLowerCase()}`}>
                          {statusLabel(st)}
                        </span>
                      </td>
                      <td>{getDentistName(t)}</td>
                      <td className="queue-td-muted">{formatTs(t.registered_at)}</td>
                      <td className="queue-td-muted">{formatTs(t.called_at)}</td>
                      <td className="queue-notes">{t.notes ? String(t.notes) : '—'}</td>
                      <td>
                        {terminal ? (
                          <span className="queue-action-muted">—</span>
                        ) : (
                          <div className="queue-actions">
                            {next.map((ns) => (
                              <button
                                key={ns}
                                type="button"
                                className={`queue-act queue-act--${ns}`}
                                disabled={busy}
                                onClick={() => patchTicketStatus(t, ns)}
                              >
                                {busy ? '…' : ns === 'in_treatment' ? 'In treatment' : statusLabel(ns)}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
