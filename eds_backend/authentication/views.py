from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.db import models
from .models import User
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    LoginSerializer, RegisterSerializer
)


class RegisterView(generics.CreateAPIView):
    """Register a new user."""
    
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'User registered successfully'
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """Login user and return JWT tokens."""
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        
        # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'Login successful'
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """Logout user by blacklisting refresh token."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({
                'message': 'Logout successful'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'error': 'Invalid token'
            }, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(APIView):
    """Get current authenticated user."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserListView(generics.ListAPIView):
    """List all users."""
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter users based on query parameters."""
        queryset = User.objects.all()
        
        # Filter by role
        role = self.request.query_params.get('role', None)
        if role:
            queryset = queryset.filter(role=role)
        
        # Filter by status
        status_param = self.request.query_params.get('status', None)
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Search by name or email
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                models.Q(first_name__icontains=search) |
                models.Q(last_name__icontains=search) |
                models.Q(email__icontains=search)
            )
        
        return queryset


class UserCreateView(generics.CreateAPIView):
    """Create a new user (admin only)."""
    
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        """Set created_by to current user."""
        serializer.save(created_by=self.request.user.get_full_name())
    
    def create(self, request, *args, **kwargs):
        """Override to return full user data with UserSerializer."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Use UserSerializer for response to include all fields
        user = serializer.instance
        output_serializer = UserSerializer(user)
        
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class UserDetailView(generics.RetrieveAPIView):
    """Retrieve a specific user."""
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


class UserUpdateView(generics.UpdateAPIView):
    """Update a specific user."""
    
    queryset = User.objects.all()
    serializer_class = UserUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        """Only allow admin/manager to update users."""
        if self.request.user.role not in ['admin', 'manager']:
            if self.request.user.id != self.kwargs.get('pk'):
                self.permission_classes = [permissions.IsAdminUser]
        return super().get_permissions()


class UserDeleteView(generics.DestroyAPIView):
    """Delete a specific user."""

    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        """Only allow admin to delete users."""
        if self.request.user.role != 'admin':
            self.permission_classes = [permissions.IsAdminUser]
        return super().get_permissions()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        # Prevent users from deleting themselves
        if instance.id == request.user.id:
            return Response({
                'error': 'You cannot delete your own account'
            }, status=status.HTTP_400_BAD_REQUEST)

        self.perform_destroy(instance)
        return Response({
            'message': 'User deleted successfully'
        }, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """Allow current user to change their own password."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response({
                'error': 'Both old_password and new_password are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        user = request.user

        # Check if old password is correct
        if not user.check_password(old_password):
            return Response({
                'error': 'Ancien mot de passe incorrect'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate new password
        if len(new_password) < 6:
            return Response({
                'error': 'Le nouveau mot de passe doit contenir au moins 6 caractères'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Set new password
        user.set_password(new_password)
        user.save()

        return Response({
            'message': 'Mot de passe changé avec succès'
        }, status=status.HTTP_200_OK)


class ResetUserPasswordView(APIView):
    """Allow admin to reset a user's password."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        # Check if user is admin
        if request.user.role != 'admin':
            return Response({
                'error': 'Seuls les administrateurs peuvent réinitialiser les mots de passe'
            }, status=status.HTTP_403_FORBIDDEN)

        new_password = request.data.get('new_password')

        if not new_password:
            return Response({
                'error': 'new_password est requis'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate new password
        if len(new_password) < 6:
            return Response({
                'error': 'Le mot de passe doit contenir au moins 6 caractères'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({
                'error': 'Utilisateur non trouvé'
            }, status=status.HTTP_404_NOT_FOUND)

        # Set new password
        user.set_password(new_password)
        user.save()

        return Response({
            'message': f'Mot de passe de {user.get_full_name()} réinitialisé avec succès'
        }, status=status.HTTP_200_OK)
