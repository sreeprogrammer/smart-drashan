from django.test import TestCase

# Create your tests here.
from django.test import SimpleTestCase

from integrations.google_sheets import validate_sync_payload


class GoogleSheetsPayloadTests(SimpleTestCase):
    def test_rejects_unknown_worksheet(self):
        with self.assertRaises(ValueError):
            validate_sync_payload('Arbitrary Sheet', 'record-1', {'name': 'Test'})

    def test_rejects_sensitive_field(self):
        with self.assertRaises(ValueError):
            validate_sync_payload('Sync Logs', 'record-1', {'password': 'secret'})

    def test_accepts_allowed_worksheet(self):
        validate_sync_payload('Local Bookings', 'record-1', {
            'booking_ref': 'SD-LOCAL-001',
            'visitor_count': 1,
        })
