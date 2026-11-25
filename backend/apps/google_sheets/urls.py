from django.urls import path

from .views import GoogleSheetsHealthView, GoogleSheetsLogsView, GoogleSheetsSyncView


urlpatterns = [
    path('sync/', GoogleSheetsSyncView.as_view(), name='google-sheets-sync'),
    path('health/', GoogleSheetsHealthView.as_view(), name='google-sheets-health'),
    path('logs/', GoogleSheetsLogsView.as_view(), name='google-sheets-logs'),
]
