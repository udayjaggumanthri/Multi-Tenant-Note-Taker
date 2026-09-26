from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.authtoken.models import Token
from users.serializers import UserSerializer, LoginSerializer
from users.models import UserRole


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        tenant = getattr(request, 'tenant', None)

        # Cross-Tenant Security Check (Phase 12)
        if tenant is not None:
            # If request is on a tenant domain, ensure user belongs to this tenant or is platform admin
            if user.role == UserRole.TENANT_ADMIN and user.tenant_id != tenant.id:
                return Response({
                    'error': f'Access denied: You belong to tenant {user.tenant_id}, but this domain belongs to tenant {tenant.id}.'
                }, status=status.HTTP_403_FORBIDDEN)
        else:
            # On platform domain, if tenant admin tries to log in to platform admin portal:
            # Only platform admins should log in to platform administration
            if request.data.get('is_platform_login') and user.role != UserRole.PLATFORM_ADMIN:
                return Response({
                    'error': 'Access denied: Only Platform Administrators can log in here.'
                }, status=status.HTTP_403_FORBIDDEN)

        token, _ = Token.objects.get_or_create(user=user)

        user_data = UserSerializer(user).data
        return Response({
            'token': token.key,
            'user': user_data,
            'message': 'Login successful'
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            # Delete auth token
            Token.objects.filter(user=request.user).delete()
        except Exception:
            pass
        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        data = serializer.data

        # Add tenant context info
        tenant = getattr(request, 'tenant', None)
        data['current_domain_tenant_id'] = tenant.id if tenant else None
        data['is_tenant_match'] = bool(tenant and request.user.tenant_id == tenant.id)

        return Response(data)
