import logging

import requests
from django.conf import settings


logger = logging.getLogger(__name__)

ALLOWED_WORKSHEETS = frozenset({
    'Dashboard Summary',
    'User Registrations',
    'Login Activity',
    'Local Bookings',
    'Special Bookings',
    'Booking Verification',
    'Temple Master',
    'District Master',
    'Crowd Analysis',
    'Daily Reports',
    'Weekly Reports',
    'Monthly Reports',
    'Slot Management',
    'Payment Records',
    'QR Check-in',
    'Admin Activity',
    'News & Events',
    'Sync Logs',
})

FORBIDDEN_FIELDS = frozenset({
    'aadhaar',
    'aadhaar_number',
    'password',
    'access_token',
    'refresh_token',
})


def find_forbidden_field(value):
    if isinstance(value, dict):
        for key, nested in value.items():
            normalized = str(key).strip().lower().replace('-', '_').replace(' ', '_')
            if normalized in FORBIDDEN_FIELDS:
                return str(key)
            found = find_forbidden_field(nested)
            if found:
                return found
    elif isinstance(value, list):
        for item in value:
            found = find_forbidden_field(item)
            if found:
                return found
    return None


def validate_sync_payload(worksheet, record_id, data):
    if worksheet not in ALLOWED_WORKSHEETS:
        raise ValueError('Unknown worksheet name.')
    if not isinstance(record_id, str) or not record_id.strip():
        raise ValueError('record_id is required.')
    if not isinstance(data, dict):
        raise ValueError('data must be a JSON object.')
    forbidden = find_forbidden_field(data)
    if forbidden:
        raise ValueError(f'Field "{forbidden}" is not allowed in Google Sheets synchronization.')


class GoogleSheetsService:
    def __init__(self):
        self.url = getattr(settings, 'GOOGLE_SHEETS_WEB_APP_URL', '')
        self.secret = getattr(settings, 'GOOGLE_SHEETS_API_SECRET', '')
        self.timeout = getattr(settings, 'GOOGLE_SHEETS_TIMEOUT_SECONDS', 15)

    def health(self):
        configured = bool(self.url and self.secret)
        return {
            'configured': configured,
            'web_app_reachable': None,
            'message': 'Google Sheets credentials are configured.' if configured else 'Google Sheets credentials are not configured.',
        }

    def sync(self, worksheet, record_id, data, action='upsert', attempt=1):
        validate_sync_payload(worksheet, record_id, data)
        if not self.url or not self.secret:
            return {
                'success': False,
                'status_code': None,
                'body': '',
                'error': 'Google Sheets integration is not configured.',
            }

        payload = {
            'action': action,
            'worksheet': worksheet,
            'record_id': record_id.strip(),
            'data': data,
            'api_secret': self.secret,
            'idempotency_key': record_id.strip(),
        }

        try:
            response = requests.post(self.url, json=payload, timeout=self.timeout)
            body = response.text[:4000]
            if 200 <= response.status_code < 300:
                try:
                    parsed = response.json()
                    success = parsed.get('success', True)
                except requests.JSONDecodeError:
                    parsed = {}
                    success = True
                if not success:
                    error = parsed.get('error', 'Google Apps Script rejected the synchronization.')
                    logger.error('Google Sheets synchronization rejected: %s', error)
                    return {'success': False, 'status_code': response.status_code, 'body': body, 'error': error}
                return {'success': True, 'status_code': response.status_code, 'body': body, 'error': None}

            error = f'Google Apps Script returned HTTP {response.status_code}.'
            logger.error('%s Worksheet=%s Record=%s Attempt=%s', error, worksheet, record_id, attempt)
            return {'success': False, 'status_code': response.status_code, 'body': body, 'error': error}
        except requests.Timeout:
            error = 'Google Apps Script request timed out.'
            logger.error('%s Worksheet=%s Record=%s Attempt=%s', error, worksheet, record_id, attempt)
            return {'success': False, 'status_code': None, 'body': '', 'error': error}
        except requests.RequestException as exc:
            error = f'Google Apps Script network error: {exc}'
            logger.error('%s Worksheet=%s Record=%s Attempt=%s', error, worksheet, record_id, attempt)
            return {'success': False, 'status_code': None, 'body': '', 'error': error}
