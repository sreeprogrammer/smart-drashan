from django.urls import path

from .views import (
    AdminTempleInformationListCreateView,
    AdminTempleInformationReviewView,
    PublicTempleInformationView,
)

urlpatterns = [
    path(
        'temple-information/<uuid:temple_id>/',
        PublicTempleInformationView.as_view(),
        name='temple-information-public',
    ),
    path(
        'admin/temple-information/',
        AdminTempleInformationListCreateView.as_view(),
        name='temple-information-admin-list-create',
    ),
    path(
        'admin/temple-information/<uuid:record_id>/review/',
        AdminTempleInformationReviewView.as_view(),
        name='temple-information-review',
    ),
]
