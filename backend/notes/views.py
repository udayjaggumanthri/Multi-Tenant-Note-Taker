from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied
from notes.models import Note
from notes.serializers import NoteSerializer
from users.permissions import IsTenantMember
from users.models import UserRole


class NoteViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Notes with STRICT Tenant Isolation (Phase 17, 19).
    Never exposes notes from other tenants.
    Never relies on frontend-supplied tenant_id.
    """
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    def get_queryset(self):
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            # No tenant resolved for this domain
            return Note.objects.none()

        # Strict security rule: always filter by request.tenant.id
        # Completely ignores any ?tenant_id query parameter
        return Note.objects.filter(tenant_id=tenant.id).select_related('created_by').order_by('-created_at')

    def get_object(self):
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            raise NotFound(detail="Tenant / domain not configured.")

        # First find by PK
        pk = self.kwargs.get('pk')
        try:
            note = Note.objects.select_related('created_by').get(pk=pk)
        except Note.DoesNotExist:
            raise NotFound(detail="Note not found.")

        # Critical Isolation Check: ensure note belongs to current request.tenant
        if note.tenant_id != tenant.id:
            # Return 404 to avoid leaking existence of notes in other tenants
            raise NotFound(detail="Note not found.")

        self.check_object_permissions(self.request, note)
        return note

    def perform_create(self, serializer):
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            raise PermissionDenied(detail="Cannot create note: no active tenant resolved for this domain.")

        # Tenant and creator are enforced on backend, never from payload
        serializer.save(
            tenant=tenant,
            created_by=self.request.user
        )
