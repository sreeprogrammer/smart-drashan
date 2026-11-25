from django.db import models

# Create your models here.
import uuid

from django.db import models


class GoogleSheetsSyncEvent(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        SYNCED = 'synced', 'Synced'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    worksheet = models.CharField(max_length=100)
    record_id = models.CharField(max_length=255)
    action = models.CharField(max_length=50, default='upsert')
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    attempts = models.PositiveSmallIntegerField(default=0)
    response_status = models.PositiveSmallIntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ('-created_at',)
        constraints = [
            models.UniqueConstraint(
                fields=('worksheet', 'record_id'),
                name='unique_google_sheets_worksheet_record',
            )
        ]

