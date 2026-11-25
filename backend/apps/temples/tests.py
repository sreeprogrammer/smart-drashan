from uuid import uuid4
from unittest.mock import patch

from rest_framework.test import APITestCase

from .authentication import SupabaseUser
from .serializers import TempleInformationReviewSerializer, TempleInformationSerializer


class TempleInformationSerializerTests(APITestCase):
    def test_details_must_be_a_json_object(self):
        serializer = TempleInformationSerializer(data={
            'temple_id': str(uuid4()),
            'section': 'facilities',
            'details': ['not', 'an', 'object'],
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('details', serializer.errors)

    def test_rejection_requires_a_reason(self):
        serializer = TempleInformationReviewSerializer(data={'status': 'rejected'})

        self.assertFalse(serializer.is_valid())
        self.assertIn('review_notes', serializer.errors)


class TempleInformationEndpointTests(APITestCase):
    def test_public_endpoint_only_requests_verified_records(self):
        temple_id = uuid4()
        with patch('apps.temples.views.supabase_rest', return_value=[]) as rest:
            response = self.client.get(f'/api/v1/temple-information/{temple_id}/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(rest.call_args.kwargs['params']['status'], 'eq.verified')
        self.assertNotIn('submitted_by', rest.call_args.kwargs['params']['select'])
        self.assertFalse(rest.call_args.kwargs['service_role'])

    @patch('apps.temples.views.supabase_rest', return_value=[{'id': 'record-id'}])
    @patch('apps.temples.views.get_temple', return_value={'id': 'temple-id', 'district_id': 'district-a'})
    @patch(
        'apps.temples.views.get_admin_assignments',
        return_value=[{'role': 'district_admin', 'district_id': 'district-b'}],
    )
    def test_district_admin_cannot_submit_for_another_district(
        self,
        _assignments,
        _temple,
        rest,
    ):
        user = SupabaseUser(str(uuid4()), 'test-access-token')
        self.client.force_authenticate(user=user, token=user.access_token)
        response = self.client.post('/api/v1/admin/temple-information/', {
            'temple_id': '11111111-1111-4111-8111-111111111111',
            'section': 'facilities',
            'details': {'drinking_water': 'available'},
        }, format='json')

        self.assertEqual(response.status_code, 403)
        rest.assert_not_called()

    @patch('apps.temples.views.supabase_rest', return_value=[{'id': 'saved-record'}])
    @patch('apps.temples.views.get_temple', return_value={'id': 'temple-id', 'district_id': 'district-a'})
    @patch(
        'apps.temples.views.get_admin_assignments',
        return_value=[{'role': 'district_admin', 'district_id': 'district-a'}],
    )
    def test_district_submission_is_always_pending(self, _assignments, _temple, rest):
        user = SupabaseUser(str(uuid4()), 'test-access-token')
        self.client.force_authenticate(user=user, token=user.access_token)
        response = self.client.post('/api/v1/admin/temple-information/', {
            'temple_id': '11111111-1111-4111-8111-111111111111',
            'section': 'facilities',
            'details': {'drinking_water': 'available'},
        }, format='json')

        self.assertEqual(response.status_code, 200)
        payload = rest.call_args.kwargs['payload'][0]
        self.assertEqual(payload['status'], 'pending')
        self.assertEqual(payload['submitted_by'], str(user.id))

    @patch(
        'apps.temples.views.get_admin_assignments',
        return_value=[{'role': 'district_admin', 'district_id': 'district-a'}],
    )
    @patch('apps.temples.views.supabase_rest')
    def test_district_admin_cannot_review_records(self, rest, _assignments):
        user = SupabaseUser(str(uuid4()), 'test-access-token')
        self.client.force_authenticate(user=user, token=user.access_token)
        response = self.client.post(f'/api/v1/admin/temple-information/{uuid4()}/review/', {
            'status': 'verified',
        }, format='json')

        self.assertEqual(response.status_code, 403)
        rest.assert_not_called()
