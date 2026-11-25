import uuid

from django.db import models


class District(models.Model):
    id = models.UUIDField(primary_key=True)
    name = models.TextField()

    class Meta:
        managed = False
        db_table = 'districts'


class Temple(models.Model):
    id = models.UUIDField(primary_key=True)
    district = models.ForeignKey(
        District,
        db_column='district_id',
        on_delete=models.DO_NOTHING,
        db_constraint=False,
        null=True,
    )
    name = models.TextField()

    class Meta:
        managed = False
        db_table = 'temples'


class TempleInformation(models.Model):
    class Section(models.TextChoices):
        ADMINISTRATION = 'administration', 'Temple Administration'
        FACILITIES = 'facilities', 'Facilities'
        TRANSPORTATION = 'transportation', 'Transportation'
        EMERGENCY = 'emergency', 'Emergency Services'
        HOTELS = 'hotels', 'Nearby Hotels'
        TIMINGS = 'timings', 'Darshan Timings'
        FESTIVALS = 'festivals', 'Festivals & Events'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        VERIFIED = 'verified', 'Verified'
        REJECTED = 'rejected', 'Rejected'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    temple = models.ForeignKey(
        Temple,
        db_column='temple_id',
        on_delete=models.DO_NOTHING,
        db_constraint=False,
    )
    section = models.CharField(max_length=32, choices=Section.choices)
    details = models.JSONField(default=dict)
    source_url = models.URLField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices)
    last_verified = models.DateTimeField(null=True, blank=True)
    submitted_by = models.UUIDField(null=True, blank=True)
    reviewed_by = models.UUIDField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'temple_information'
        unique_together = (('temple', 'section'),)
