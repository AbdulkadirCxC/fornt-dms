import { useEffect, useMemo, useState } from 'react';
import { patientRecallsApi, patientsApi, recallNotificationsApi } from '../api/services';
import SearchableSelect from '../components/SearchableSelect';
import './RecallNotifications.css';

const METHOD_OPTIONS = [
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'call', label: 'Call' },
];

const INITIAL_FORM = {
  recall: '',
  patient: '',
  reminder_date: '',
  method: 'whatsapp',
  sent: false,
};

function normalizeList(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const key of ['results', 'data', 'items', ...keys]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString();
}

function toOption(value, label) {
  return { value: String(value), label };
}

export default function RecallNotifications() {
  const [items, setItems] = useState([]);
  const [dueTodayItems, setDueTodayItems] = useState([]);
  const [dueLoading, setDueLoading] = useState(true);
  const [sendingId, setSendingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [recallOptions, setRecallOptions] = useState([]);
  const [patientOptions, setPatientOptions] = useState([]);

  const isEditing = editingId != null;
  const methodOptions = useMemo(() => METHOD_OPTIONS, []);

  const fetchItems = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await recallNotificationsApi.getAll({ ordering: '-id', limit: 300 });
      setItems(normalizeList(res.data, ['recall_notifications', 'notifications']));
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load recall notifications.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDueToday = async (silent = false) => {
    if (!silent) setDueLoading(true);
    setError('');
    try {
      const res = await recallNotificationsApi.dueToday();
      setDueTodayItems(normalizeList(res.data, ['recall_notifications', 'notifications', 'due_today']));
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load due reminders.');
      setDueTodayItems([]);
    } finally {
      setDueLoading(false);
    }
  };

  const fetchSelectData = async () => {
    try {
      const [recallsRes, patientsRes] = await Promise.all([
        patientRecallsApi.getAll({ ordering: '-id', limit: 500 }),
        patientsApi.getAll({ ordering: '-id', limit: 500 }),
      ]);
      const recalls = normalizeList(recallsRes.data, ['patient_recalls', 'recalls']);
      const patients = normalizeList(patientsRes.data, ['patients']);
      setRecallOptions(
        recalls
          .map((r) =>
            toOption(
              r.id ?? r.recall_id,
              `#${r.id ?? r.recall_id} - ${r.patient_name ?? 'Patient'} (${r.recall_type ?? 'recall'})`
            )
          )
          .filter((o) => o.value)
      );
      setPatientOptions(
        patients
          .map((p) => toOption(p.id ?? p.patient_id, p.full_name ?? p.name ?? `#${p.id}`))
          .filter((o) => o.value)
      );
    } catch {
      setRecallOptions([]);
      setPatientOptions([]);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchSelectData();
    fetchDueToday();
  }, []);

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.recall || !formData.patient || !formData.reminder_date) {
      setError('Recall, patient and reminder date are required.');
      return;
    }
    const payload = {
      recall: Number(formData.recall),
      patient: Number(formData.patient),
      reminder_date: formData.reminder_date,
      method: formData.method,
      sent: Boolean(formData.sent),
    };
    setSaving(true);
    try {
      if (isEditing) {
        await recallNotificationsApi.update(editingId, payload);
      } else {
        await recallNotificationsApi.create(payload);
      }
      resetForm();
      await fetchItems(true);
    } catch (err) {
      setError(err.response?.data?.message ?? err.response?.data?.detail ?? 'Failed to save notification.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    const id = row.id ?? row.notification_id ?? row.pk;
    if (!id) return;
    setEditingId(Number(id));
    setShowForm(true);
    setFormData({
      recall: String(row.recall ?? row.recall_id ?? ''),
      patient: String(row.patient ?? row.patient_id ?? ''),
      reminder_date: (row.reminder_date ?? '').slice(0, 10),
      method: row.method ?? 'whatsapp',
      sent: Boolean(row.sent),
    });
  };

  const handleDelete = async (row) => {
    const id = row.id ?? row.notification_id ?? row.pk;
    if (!id) return;
    if (!window.confirm('Delete this notification?')) return;
    setError('');
    try {
      await recallNotificationsApi.delete(id);
      await fetchItems(true);
    } catch (err) {
      setError(err.response?.data?.message ?? err.response?.data?.detail ?? 'Failed to delete notification.');
    }
  };

  const getReminderPhone = (row) =>
    row?.patient_phone ??
    row?.phone ??
    row?.tel ??
    row?.patient?.phone ??
    row?.patient?.tel ??
    '';

  const getVisitDate = (row) =>
    row?.visit_date ??
    row?.next_visit ??
    row?.recall_next_visit ??
    row?.recall?.next_visit ??
    '';

  const getPatientName = (row) =>
    row?.patient ??
    row?.patient_name ??
    row?.patient?.full_name ??
    row?.patient?.name ??
    labelFromOptions(patientOptions, row?.patient ?? row?.patient_id);

  const getReminderLink = (row) => {
    const method = String(row?.method ?? '').toLowerCase();
    if (method === 'whatsapp' && row?.whatsapp_link) return row.whatsapp_link;
    if (method === 'sms' && row?.sms_link) return row.sms_link;
    if (row?.whatsapp_link) return row.whatsapp_link;
    if (row?.sms_link) return row.sms_link;
    return '';
  };

  const handleSendWhatsApp = async (row) => {
    const id = row?.id ?? row?.notification_id ?? row?.pk;
    if (!id) return;
    const reminderLink = getReminderLink(row);
    if (reminderLink) {
      const popup = window.open(reminderLink, '_blank', 'noopener,noreferrer');
      if (!popup) {
        setError('Please allow pop-ups to open WhatsApp.');
        return;
      }
      setSendingId(id);
      setError('');
      try {
        await recallNotificationsApi.markSent(id);
        await Promise.all([fetchItems(true), fetchDueToday(true)]);
      } catch (err) {
        setError(err.response?.data?.message ?? err.response?.data?.detail ?? 'Failed to mark notification as sent.');
      } finally {
        setSendingId(null);
      }
      return;
    }

    const rawPhone = getReminderPhone(row);
    const phone = String(rawPhone || '').replace(/[^\d]/g, '');
    if (!phone) {
      setError('Patient phone is missing for this reminder.');
      return;
    }
    const patientName = getPatientName(row);
    const visitDate = getVisitDate(row);
    const message =
      row?.message ??
      `Hello ${patientName}, this is your dental recall reminder. Your next visit is on ${formatDate(visitDate)}.`;
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(String(message))}`;

    const popup = window.open(waUrl, '_blank', 'noopener,noreferrer');
    if (!popup) {
      setError('Please allow pop-ups to open WhatsApp.');
      return;
    }

    setSendingId(id);
    setError('');
    try {
      await recallNotificationsApi.markSent(id);
      await Promise.all([fetchItems(true), fetchDueToday(true)]);
    } catch (err) {
      setError(err.response?.data?.message ?? err.response?.data?.detail ?? 'Failed to mark notification as sent.');
    } finally {
      setSendingId(null);
    }
  };

  const labelFromOptions = (options, value) => options.find((o) => String(o.value) === String(value))?.label ?? '—';

  return (
    <div className="recall-notifications-page">
      <div className="page-header">
        <h1>Recall Notifications</h1>
        <button type="button" className="btn-add" onClick={() => (showForm ? resetForm() : setShowForm(true))}>
          {showForm ? 'Close' : 'Add Notification'}
        </button>
      </div>

      {error && <div className="page-error">{error}</div>}

      <div className="due-today-wrap">
        <div className="due-header">
          <h3>Today&apos;s Reminders</h3>
          <button
            type="button"
            className="btn-reload-due"
            onClick={() => fetchDueToday()}
            disabled={dueLoading}
            title="Reload due reminders"
          >
            {dueLoading ? 'Loading…' : 'Reload'}
          </button>
        </div>
        {dueLoading ? (
          <p>Loading today reminders...</p>
        ) : dueTodayItems.length === 0 ? (
          <p className="empty-state">No reminders due today.</p>
        ) : (
          <div className="notify-table-wrap">
            <table className="notify-table due-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Visit Date</th>
                  <th>Reminder</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {dueTodayItems.map((row) => {
                  const id = row.id ?? row.notification_id ?? row.pk;
                  const busy = sendingId === id;
                  return (
                    <tr key={id ?? `${row.patient}-${row.reminder_date}`}>
                      <td>{getPatientName(row)}</td>
                      <td>{formatDate(getVisitDate(row))}</td>
                      <td>{formatDate(row.reminder_date)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-send-whatsapp"
                          disabled={busy || row.sent}
                          onClick={() => handleSendWhatsApp(row)}
                        >
                          {row.sent ? 'Sent' : busy ? 'Sending...' : 'Send WhatsApp'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="notify-form-wrap">
          <form className="notify-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Recall</label>
                <SearchableSelect
                  name="recall"
                  value={formData.recall}
                  onChange={handleChange}
                  options={recallOptions}
                  emptyOptionLabel="Select recall"
                  searchPlaceholder="Search recall..."
                />
              </div>
              <div className="form-group">
                <label>Patient</label>
                <SearchableSelect
                  name="patient"
                  value={formData.patient}
                  onChange={handleChange}
                  options={patientOptions}
                  emptyOptionLabel="Select patient"
                  searchPlaceholder="Search patient..."
                />
              </div>
              <div className="form-group">
                <label>Reminder Date</label>
                <input type="date" name="reminder_date" value={formData.reminder_date} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Method</label>
                <SearchableSelect
                  name="method"
                  value={formData.method}
                  onChange={handleChange}
                  options={methodOptions}
                  showEmptyOption={false}
                  searchPlaceholder="Search method..."
                />
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input type="checkbox" name="sent" checked={formData.sent} onChange={handleChange} /> Sent
                </label>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={resetForm} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn-submit" disabled={saving}>
                {saving ? 'Saving...' : isEditing ? 'Update Notification' : 'Create Notification'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p>Loading notifications...</p>
      ) : (
        <div className="notify-table-wrap">
          <table className="notify-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Recall</th>
                <th>Patient</th>
                <th>Reminder Date</th>
                <th>Method</th>
                <th>Sent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7}>No notifications found.</td>
                </tr>
              ) : (
                items.map((row) => {
                  const id = row.id ?? row.notification_id ?? row.pk;
                  return (
                    <tr key={id ?? `${row.recall}-${row.patient}-${row.reminder_date}`}>
                      <td>{id ?? '—'}</td>
                      <td>{row.recall_name ?? labelFromOptions(recallOptions, row.recall ?? row.recall_id)}</td>
                      <td>{row.patient_name ?? labelFromOptions(patientOptions, row.patient ?? row.patient_id)}</td>
                      <td>{formatDate(row.reminder_date)}</td>
                      <td>{row.method ?? '—'}</td>
                      <td>{row.sent ? 'Yes' : 'No'}</td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="btn-edit" onClick={() => handleEdit(row)}>
                            Edit
                          </button>
                          <button type="button" className="btn-delete" onClick={() => handleDelete(row)}>
                            Delete
                          </button>
                        </div>
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

