export const ROUTE_PERMISSIONS = {
  '/': [],
  '/register': ['view_user', 'add_user', 'change_user', 'delete_user'],
  '/dentists': ['view_dentist'],
  '/patients': ['view_patient'],
  '/treatments': ['view_treatment'],
  '/patient-treatments': ['view_patient_treatment', 'view_patienttreatment'],
  '/patient-recalls': ['view_patient_recall', 'view_patientrecall'],
  '/recall-notifications': ['view_recall_notification', 'view_recallnotification'],
  '/invoices': ['view_invoice'],
  '/payments': ['view_payment'],
  '/appointments': ['view_appointment'],
  '/queue': ['view_appointment'],
  '/queue-display': ['view_appointment'],
  '/reports': ['view_report', 'view_logentry', 'view_invoice', 'view_payment'],
  '/roles-permissions': ['view_role', 'view_group', 'view_permission', 'change_permission'],
};

