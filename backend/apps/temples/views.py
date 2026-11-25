from uuid import UUID
from urllib.parse import urlparse
from numbers import Number

from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .authentication import SupabaseJWTAuthentication
from .models import TempleInformation
from .serializers import TempleInformationReviewSerializer, TempleInformationSerializer
from .services import get_admin_assignments, get_temple, supabase_rest

PUBLIC_FIELDS = (
    'id,temple_id,section,details,source_url,status,last_verified,'
    'created_at,updated_at'
)
ADMIN_FIELDS = (
    'id,temple_id,section,details,source_url,status,last_verified,'
    'submitted_by,reviewed_by,review_notes,created_at,updated_at'
)


def _admin_scope(user_id):
    assignments = get_admin_assignments(user_id)
    state_admin = any(row.get('role') == 'state_admin' for row in assignments)
    district_ids = {
        row['district_id']
        for row in assignments
        if row.get('role') == 'district_admin' and row.get('district_id')
    }
    if not state_admin and not district_ids:
        raise PermissionDenied('State Admin or District Admin access is required.')
    return state_admin, district_ids


def _uuid(value, field_name):
    try:
        return str(value if isinstance(value, UUID) else UUID(str(value)))
    except (ValueError, TypeError, AttributeError) as exc:
        raise ValidationError({field_name: 'Provide a valid UUID.'}) from exc


def _can_manage_temple(user_id, temple_id, state_admin, district_ids):
    temple = get_temple(temple_id)
    if not temple:
        raise NotFound('Temple not found.')
    if not state_admin and temple.get('district_id') not in district_ids:
        raise PermissionDenied('You can only manage temples in your assigned district.')
    return temple


def _has_verified_content(value):
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (bool, Number)):
        return True
    if isinstance(value, list):
        return any(_has_verified_content(item) for item in value)
    if isinstance(value, dict):
        return any(key != 'photos' and _has_verified_content(item) for key, item in value.items())
    return False


class PublicTempleInformationView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, temple_id):
        temple_id = _uuid(temple_id, 'temple_id')
        rows = supabase_rest(
            'GET',
            'temple_information',
            params={
                'select': PUBLIC_FIELDS,
                'temple_id': f'eq.{temple_id}',
                'status': f'eq.{TempleInformation.Status.VERIFIED}',
                'order': 'section.asc',
                'limit': '7',
            },
            service_role=False,
        )
        return Response(rows)


class AdminTempleInformationListCreateView(APIView):
    authentication_classes = [SupabaseJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        state_admin, district_ids = _admin_scope(str(request.user.id))
        params = {
            'select': f'{ADMIN_FIELDS},temples!inner(name,district_id)',
            'order': 'section.asc',
            'limit': '1000',
        }

        district_id = request.query_params.get('district_id')
        if district_id:
            district_id = _uuid(district_id, 'district_id')
            if not state_admin and district_id not in district_ids:
                raise PermissionDenied('You can only view your assigned district.')
            params['temples.district_id'] = f'eq.{district_id}'
        elif not state_admin:
            district = next(iter(district_ids))
            params['temples.district_id'] = f'eq.{district}'

        temple_id = request.query_params.get('temple_id')
        if temple_id:
            params['temple_id'] = f'eq.{_uuid(temple_id, "temple_id")}'
        info_status = request.query_params.get('status')
        if info_status:
            valid_statuses = {choice for choice, _ in TempleInformation.Status.choices}
            if info_status not in valid_statuses:
                raise ValidationError({'status': 'Use pending, verified, or rejected.'})
            params['status'] = f'eq.{info_status}'

        rows = supabase_rest('GET', 'temple_information', params=params, user_token=request.auth)
        return Response(rows)

    def post(self, request):
        state_admin, district_ids = _admin_scope(str(request.user.id))
        serializer = TempleInformationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        temple_id = str(values['temple_id'])
        _can_manage_temple(str(request.user.id), temple_id, state_admin, district_ids)

        payload = {
            'temple_id': temple_id,
            'section': values['section'],
            'details': values['details'],
            'source_url': values.get('source_url'),
            'status': TempleInformation.Status.PENDING,
            'submitted_by': str(request.user.id),
            'reviewed_by': None,
            'last_verified': None,
        }
        rows = supabase_rest(
            'POST',
            'temple_information',
            params={'on_conflict': 'temple_id,section'},
            payload=[payload],
            prefer='resolution=merge-duplicates,return=representation',
            user_token=request.auth,
        )
        return Response(rows[0] if rows else payload, status=status.HTTP_200_OK)


class AdminTempleInformationReviewView(APIView):
    authentication_classes = [SupabaseJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, record_id):
        state_admin, district_ids = _admin_scope(str(request.user.id))
        if not state_admin:
            raise PermissionDenied('Only a State Admin can review temple information.')
        record_id = _uuid(record_id, 'record_id')
        serializer = TempleInformationReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        decision = serializer.validated_data

        records = supabase_rest(
            'GET',
            'temple_information',
            params={
                'select': 'id,temple_id,source_url,status,details',
                'id': f'eq.{record_id}',
                'limit': '1',
            },
            user_token=request.auth,
        )
        if not records:
            raise NotFound('Temple information record not found.')
        record = records[0]
        _can_manage_temple(
            str(request.user.id),
            record['temple_id'],
            state_admin,
            district_ids,
        )
        if decision['status'] == TempleInformation.Status.VERIFIED:
            source_url = record.get('source_url', '')
            if not source_url or urlparse(source_url).scheme not in {'http', 'https'}:
                raise ValidationError({'source_url': 'Add a valid source URL before verification.'})
            if not _has_verified_content(record.get('details', {})):
                raise ValidationError({'details': 'Add at least one information value before verification.'})

        payload = {
            'status': decision['status'],
            'reviewed_by': str(request.user.id),
            'review_notes': decision.get('review_notes', '').strip(),
            'last_verified': timezone.now().isoformat()
            if decision['status'] == TempleInformation.Status.VERIFIED
            else None,
        }
        rows = supabase_rest(
            'PATCH',
            'temple_information',
            params={'id': f'eq.{record_id}', 'select': ADMIN_FIELDS},
            payload=payload,
            prefer='return=representation',
            user_token=request.auth,
        )
        if not rows:
            raise NotFound('Temple information record could not be updated.')
        return Response(rows[0])
