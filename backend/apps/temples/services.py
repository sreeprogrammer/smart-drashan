import logging

import requests
from django.conf import settings
from rest_framework.exceptions import APIException

logger = logging.getLogger(__name__)


class SupabaseUnavailable(APIException):
    status_code = 503
    default_detail = 'The temple information service is unavailable.'
    default_code = 'supabase_unavailable'


def _headers(*, service_role=True, user_token=None):
    key = settings.SUPABASE_SERVICE_ROLE_KEY if service_role or user_token else settings.SUPABASE_ANON_KEY
    if not settings.SUPABASE_REST_URL or not key:
        raise SupabaseUnavailable('Configure the Supabase REST URL and API keys in the backend environment.')
    return {
        'apikey': key,
        'Authorization': f'Bearer {user_token or key}',
        'Content-Type': 'application/json',
    }


def supabase_rest(method, resource, *, params=None, payload=None, prefer=None, service_role=True, user_token=None):
    url = f'{settings.SUPABASE_REST_URL}/{resource.lstrip("/")}'
    headers = _headers(service_role=service_role, user_token=user_token)
    if prefer:
        headers['Prefer'] = prefer
    try:
        response = requests.request(
            method,
            url,
            headers=headers,
            params=params,
            json=payload,
            timeout=settings.SUPABASE_REQUEST_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        logger.warning('Supabase REST request failed for %s: %s', resource, exc.__class__.__name__)
        raise SupabaseUnavailable() from exc
    if not response.ok:
        logger.error('Supabase REST request failed for %s with HTTP %s', resource, response.status_code)
        raise SupabaseUnavailable(f'The temple information request failed (HTTP {response.status_code}).')
    if response.status_code == 204 or not response.content:
        return []
    try:
        body = response.json()
    except ValueError as exc:
        logger.error('Supabase REST returned invalid JSON for %s', resource)
        raise SupabaseUnavailable('The temple information service returned an invalid response.') from exc
    return body if isinstance(body, list) else [body]


def get_admin_assignments(user_id):
    assignments = supabase_rest(
        'GET',
        'admin_assignments',
        params={
            'select': 'role,district_id,temple_id',
            'user_id': f'eq.{user_id}',
            'is_active': 'eq.true',
        },
    )
    legacy = supabase_rest(
        'GET',
        'temple_admins',
        params={
            'select': 'role,is_active',
            'user_id': f'eq.{user_id}',
            'is_active': 'eq.true',
        },
    )
    if any(row.get('role') == 'super_admin' for row in legacy):
        assignments.append({'role': 'state_admin', 'district_id': None, 'temple_id': None})
    return assignments


def get_temple(temple_id):
    rows = supabase_rest(
        'GET',
        'temples',
        params={'select': 'id,district_id', 'id': f'eq.{temple_id}', 'limit': '1'},
    )
    return rows[0] if rows else None
