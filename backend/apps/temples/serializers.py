from urllib.parse import urlparse

from rest_framework import serializers

from .models import TempleInformation


class TempleInformationSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    temple_id = serializers.UUIDField()
    section = serializers.ChoiceField(choices=TempleInformation.Section.choices)
    details = serializers.JSONField()
    source_url = serializers.URLField(allow_blank=True, allow_null=True, required=False)
    status = serializers.ChoiceField(choices=TempleInformation.Status.choices, read_only=True)
    last_verified = serializers.DateTimeField(read_only=True, allow_null=True)
    review_notes = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def validate_details(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('Details must be a JSON object.')
        return value

    def validate_source_url(self, value):
        if value and urlparse(value).scheme not in {'http', 'https'}:
            raise serializers.ValidationError('Use an HTTP or HTTPS source URL.')
        return value or None


class TempleInformationReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=(TempleInformation.Status.VERIFIED, TempleInformation.Status.REJECTED)
    )
    review_notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)

    def validate(self, attrs):
        if attrs['status'] == TempleInformation.Status.REJECTED and not attrs.get('review_notes', '').strip():
            raise serializers.ValidationError({'review_notes': 'Add a reason when rejecting information.'})
        return attrs
