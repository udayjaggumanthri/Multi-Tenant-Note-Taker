from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserRole(models.TextChoices):
    PLATFORM_ADMIN = 'PLATFORM_ADMIN', 'Platform Admin'
    TENANT_ADMIN = 'TENANT_ADMIN', 'Tenant Admin'


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, name='', role=UserRole.TENANT_ADMIN, tenant=None, **extra_fields):
        if not email:
            raise ValueError('Email address is required')
        email = self.normalize_email(email)
        user = self.model(
            email=email,
            name=name,
            role=role,
            tenant=tenant,
            **extra_fields
        )
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, name='Platform Superuser', **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(
            email=email,
            password=password,
            name=name,
            role=UserRole.PLATFORM_ADMIN,
            tenant=None,
            **extra_fields
        )


class User(AbstractBaseUser, PermissionsMixin):
    tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='users',
        db_column='tenant_id'
    )
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=30,
        choices=UserRole.choices,
        default=UserRole.TENANT_ADMIN
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    class Meta:
        db_table = 'users'
        ordering = ['id']

    def __str__(self):
        return f"{self.email} ({self.role}, Tenant: {self.tenant_id})"
