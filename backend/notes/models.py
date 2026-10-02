from django.conf import settings
from django.db import models


class Note(models.Model):
    title = models.CharField(max_length=255)
    content = models.TextField()
    category = models.CharField(max_length=50, blank=True, default='General')
    is_pinned = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.DO_NOTHING,
        null=True,
        blank=True,
        related_name='notes',
        db_constraint=False
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notes'
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return f"{'[PINNED] ' if self.is_pinned else ''}{self.title}"

    @property
    def tenant_id(self):
        """Returns the ID of the tenant whose schema this note belongs to."""
        from django.db import connection
        return getattr(connection.tenant, 'id', None)
