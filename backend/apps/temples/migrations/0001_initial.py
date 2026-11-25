import uuid

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='District',
            fields=[
                ('id', models.UUIDField(primary_key=True, serialize=False)),
                ('name', models.TextField()),
            ],
            options={
                'db_table': 'districts',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='Temple',
            fields=[
                ('id', models.UUIDField(primary_key=True, serialize=False)),
                ('name', models.TextField()),
                ('district', models.ForeignKey(
                    db_column='district_id',
                    db_constraint=False,
                    null=True,
                    on_delete=django.db.models.deletion.DO_NOTHING,
                    to='temples.district',
                )),
            ],
            options={
                'db_table': 'temples',
                'managed': False,
            },
        ),
        migrations.CreateModel(
            name='TempleInformation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, primary_key=True, serialize=False)),
                ('section', models.CharField(max_length=32, choices=[
                    ('administration', 'Temple Administration'),
                    ('facilities', 'Facilities'),
                    ('transportation', 'Transportation'),
                    ('emergency', 'Emergency Services'),
                    ('hotels', 'Nearby Hotels'),
                    ('timings', 'Darshan Timings'),
                    ('festivals', 'Festivals & Events'),
                ])),
                ('details', models.JSONField(default=dict)),
                ('source_url', models.URLField(blank=True, null=True)),
                ('status', models.CharField(max_length=16, choices=[
                    ('pending', 'Pending'),
                    ('verified', 'Verified'),
                    ('rejected', 'Rejected'),
                ])),
                ('last_verified', models.DateTimeField(blank=True, null=True)),
                ('submitted_by', models.UUIDField(blank=True, null=True)),
                ('reviewed_by', models.UUIDField(blank=True, null=True)),
                ('review_notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField()),
                ('updated_at', models.DateTimeField()),
                ('temple', models.ForeignKey(
                    db_column='temple_id',
                    db_constraint=False,
                    on_delete=django.db.models.deletion.DO_NOTHING,
                    to='temples.temple',
                )),
            ],
            options={
                'db_table': 'temple_information',
                'managed': False,
                'unique_together': {('temple', 'section')},
            },
        ),
    ]
