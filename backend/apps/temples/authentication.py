import logging
from uuid import UUID

import requests
from django.conf import settings
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from .services import SupabaseUnavailable

logger = logging.getLogger(__name__)


class SupabaseUser:
    is_authenticated = True
    is_anonymous = False

    def __init__(self, user_id, access_token):
        self.id = UUID(user_id)
        self.pk = self.id
        self.access_token = access_token


class SupabaseJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        parts = get_authorization_header(request).split()
        if not parts:
            return None
        if len(parts) != 2 or parts[0].lower() != b'bearer':
            raise AuthenticationFailed('Use a valid Supabase Bearer access token.')
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            raise SupabaseUnavailable('Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the backend environment.')

        try:
            token = parts[1].decode('utf-8')
        except UnicodeDecodeError as exc:
            raise AuthenticationFailed('The Supabase access token is malformed.') from exc
        try:
            response = requests.get(
                f'{settings.SUPABASE_URL}/auth/v1/user',
                headers={
                    'apikey': settings.SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': f'Bearer {token}',
                },
                timeout=settings.SUPABASE_REQUEST_TIMEOUT_SECONDS,
            )
        except requests.RequestException as exc:
            logger.warning('Supabase access-token validation failed: %s', exc.__class__.__name__)
            raise SupabaseUnavailable('Supabase authentication is temporarily unavailable.') from exc

        if response.status_code in (401, 403):
            raise AuthenticationFailed('The Supabase access token is invalid or expired.')
        if not response.ok:
            logger.error('Supabase access-token validation failed with HTTP %s', response.status_code)
            raise SupabaseUnavailable('Supabase authentication is temporarily unavailable.')

        try:
            user_id = response.json().get('id')
            return SupabaseUser(user_id, token), token
        except (ValueError, AttributeError, TypeError) as exc:
            raise AuthenticationFailed('Supabase returned an invalid user identity.') from exc

    def authenticate_header(self, request):
        return 'Bearer'
