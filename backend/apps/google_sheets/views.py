from django.shortcuts import render

# Create your views here.
from django.db import transaction
from rest_framework import serializers, status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from integrations.google_sheets import GoogleSheetsService, ALLOWED_WORKSHEETS, validate_sync_payload

from .models import GoogleSheetsSyncEvent
from .tasks import process_sync_event


class GoogleSheetsSyncSerializer(serializers.Serializer):
    worksheet = serializers.ChoiceField(choices=sorted(ALLOWED_WORKSHEETS))
    record_id = serializers.CharField(max_length=255)
    action = serializers.ChoiceField(choices=('upsert', 'delete'), default='upsert')
    data = serializers.DictField(required=True)


class GoogleSheetsSyncView(APIView):
    permission_classes = (IsAdminUser,)

    def post(self, request):
        serializer = GoogleSheetsSyncSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        try:
            validate_sync_payload(validated['worksheet'], validated['record_id'], validated['data'])
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        event, created = GoogleSheetsSyncEvent.objects.get_or_create(
            worksheet=validated['worksheet'],
            record_id=validated['record_id'].strip(),
            defaults={
                'action': validated['action'],
                'payload': validated['data'],
                'status': GoogleSheetsSyncEvent.Status.PENDING,
            },
        )

        if not created:
            event.action = validated['action']
            event.payload = validated['data']
            if event.status == GoogleSheetsSyncEvent.Status.SYNCED:
                event.status = GoogleSheetsSyncEvent.Status.PENDING
            event.save(update_fields=('action', 'payload', 'status', 'updated_at'))

        def enqueue_sync():
            try:
                process_sync_event.delay(str(event.id))
            except Exception:
                event.status = GoogleSheetsSyncEvent.Status.PENDING
                event.error_message = 'Queued for retry; the background worker or broker is unavailable.'
                event.save(update_fields=('status', 'error_message', 'updated_at'))

        transaction.on_commit(enqueue_sync)

        return Response({
            'accepted': True,
            'event_id': str(event.id),
            'status': event.status,
            'duplicate': not created,
        }, status=status.HTTP_202_ACCEPTED)


class GoogleSheetsHealthView(APIView):
    permission_classes = (IsAdminUser,)

    def get(self, request):
        return Response(GoogleSheetsService().health())


class GoogleSheetsLogsView(APIView):
    permission_classes = (IsAdminUser,)

    def get(self, request):
        worksheet = request.query_params.get('worksheet')
        queryset = GoogleSheetsSyncEvent.objects.all()
        if worksheet:
            queryset = queryset.filter(worksheet=worksheet)
        logs = [{
            'event_id': str(item.id),
            'worksheet': item.worksheet,
            'record_id': item.record_id,
            'action': item.action,
            'status': item.status,
            'attempts': item.attempts,
            'response_status': item.response_status,
            'error_message': item.error_message,
            'created_at': item.created_at,
            'updated_at': item.updated_at,
            'completed_at': item.completed_at,
        } for item in queryset[:100]]
        return Response({'count': queryset.count(), 'logs': logs})
