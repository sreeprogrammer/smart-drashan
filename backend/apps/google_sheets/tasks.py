from celery import shared_task
from django.db import transaction
from django.utils import timezone

from integrations.google_sheets import GoogleSheetsService

from .models import GoogleSheetsSyncEvent


@shared_task(bind=True, max_retries=5)
def process_sync_event(self, event_id):
    with transaction.atomic():
        event = GoogleSheetsSyncEvent.objects.select_for_update().get(id=event_id)
        event.status = GoogleSheetsSyncEvent.Status.PROCESSING
        event.attempts += 1
        event.save(update_fields=('status', 'attempts', 'updated_at'))

    result = GoogleSheetsService().sync(
        worksheet=event.worksheet,
        record_id=event.record_id,
        data=event.payload,
        action=event.action,
        attempt=event.attempts,
    )

    with transaction.atomic():
        event = GoogleSheetsSyncEvent.objects.select_for_update().get(id=event_id)
        event.response_status = result['status_code']
        event.response_body = result['body'][:4000]
        if result['success']:
            event.status = GoogleSheetsSyncEvent.Status.SYNCED
            event.error_message = ''
            event.completed_at = timezone.now()
            event.save(update_fields=(
                'status',
                'response_status',
                'response_body',
                'error_message',
                'completed_at',
                'updated_at',
            ))
            return {'success': True, 'event_id': event_id}

        event.error_message = result['error']
        if event.attempts < self.max_retries:
            event.status = GoogleSheetsSyncEvent.Status.PENDING
            event.save(update_fields=('status', 'response_status', 'response_body', 'error_message', 'updated_at'))
            raise self.retry(countdown=min(300, 30 * (2 ** (event.attempts - 1))))

        event.status = GoogleSheetsSyncEvent.Status.FAILED
        event.completed_at = timezone.now()
        event.save(update_fields=(
            'status',
            'response_status',
            'response_body',
            'error_message',
            'completed_at',
            'updated_at',
        ))
        return {'success': False, 'event_id': event_id, 'error': result['error']}
