from rest_framework import serializers
from notes.models import Note


class NoteSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    tenant_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Note
        fields = [
            'id', 'tenant_id', 'title', 'content', 'category', 'is_pinned',
            'created_by', 'created_by_name', 'created_by_email',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tenant_id', 'created_by', 'created_at', 'updated_at']
