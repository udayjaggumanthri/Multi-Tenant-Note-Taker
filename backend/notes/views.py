from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied
from notes.models import Note
from notes.serializers import NoteSerializer
from users.permissions import IsTenantMember


class NoteViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Notes with PHYSICAL PostgreSQL Schema Isolation (django-tenants).
    
    - PostgreSQL 'search_path' isolates tenant tables physically at database engine level.
    - Zero cross-tenant data leaks.
    - Includes search, category filters, pinning, and note export.
    """
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        tenant = getattr(self.request, 'tenant', None)
        if not tenant or tenant.schema_name == 'public':
            return Note.objects.none()

        qs = Note.objects.select_related('created_by').all()

        # Search filter
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(content__icontains=search) | Q(category__icontains=search))

        # Category filter
        category = self.request.query_params.get('category', '').strip()
        if category and category.lower() != 'all':
            qs = qs.filter(category__iexact=category)

        return qs.order_by('-is_pinned', '-created_at')

    def perform_create(self, serializer):
        tenant = getattr(self.request, 'tenant', None)
        if not tenant or tenant.schema_name == 'public':
            raise PermissionDenied(detail="Cannot create note: no active tenant resolved for this domain.")

        # Note is saved directly into the tenant's physical schema
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='toggle-pin')
    def toggle_pin(self, request, pk=None):
        note = self.get_object()
        note.is_pinned = not note.is_pinned
        note.save(update_fields=['is_pinned'])
        return Response(NoteSerializer(note).data)

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request):
        """Exports all notes for the current tenant in JSON format."""
        notes = self.get_queryset()
        data = NoteSerializer(notes, many=True).data
        return Response({
            'tenant': request.tenant.name,
            'schema': request.tenant.schema_name,
            'total_notes': len(data),
            'notes': data
        })
