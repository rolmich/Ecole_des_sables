from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model matching React frontend interface."""
    
    firstName = serializers.CharField(source='first_name')
    lastName = serializers.CharField(source='last_name')
    permissions = serializers.JSONField(source='custom_permissions')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    createdBy = serializers.CharField(source='created_by', read_only=True)
    lastLogin = serializers.DateTimeField(source='last_login', read_only=True, allow_null=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'firstName', 'lastName', 'email', 'username', 
            'phone', 'role', 'department', 'permissions', 'status',
            'lastLogin', 'createdAt', 'createdBy'
        ]
        read_only_fields = ['id', 'createdAt', 'createdBy', 'lastLogin']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating users."""
    
    firstName = serializers.CharField(source='first_name')
    lastName = serializers.CharField(source='last_name')
    permissions = serializers.JSONField(source='custom_permissions', required=False, default=list)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    
    class Meta:
        model = User
        fields = [
            'firstName', 'lastName', 'email', 'username', 
            'phone', 'role', 'department', 'permissions', 
            'status', 'password'
        ]
    
    def create(self, validated_data):
        """Create a new user with encrypted password."""
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating users."""
    
    firstName = serializers.CharField(source='first_name', required=False)
    lastName = serializers.CharField(source='last_name', required=False)
    permissions = serializers.JSONField(source='custom_permissions', required=False)
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    
    class Meta:
        model = User
        fields = [
            'firstName', 'lastName', 'email', 'username', 
            'phone', 'role', 'department', 'permissions', 
            'status', 'password'
        ]
    
    def update(self, instance, validated_data):
        """Update user, handle password separately."""
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance


class LoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    
    def validate(self, data):
        """Validate and authenticate user."""
        email = data.get('email')
        password = data.get('password')
        
        if email and password:
            # Authenticate using email instead of username
            try:
                user = User.objects.get(email=email)
                if user.check_password(password):
                    if not user.is_active:
                        raise serializers.ValidationError('User account is disabled.')
                    data['user'] = user
                else:
                    raise serializers.ValidationError('Unable to log in with provided credentials.')
            except User.DoesNotExist:
                raise serializers.ValidationError('Unable to log in with provided credentials.')
        else:
            raise serializers.ValidationError('Must include "email" and "password".')
        
        return data


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    
    firstName = serializers.CharField(source='first_name')
    lastName = serializers.CharField(source='last_name')
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    
    class Meta:
        model = User
        fields = ['firstName', 'lastName', 'email', 'username', 'password', 'password2']
    
    def validate(self, data):
        """Validate that passwords match."""
        if data.get('password') != data.get('password2'):
            raise serializers.ValidationError({'password': 'Passwords must match.'})
        return data
    
    def create(self, validated_data):
        """Create a new user."""
        validated_data.pop('password2')
        password = validated_data.pop('password')
        
        # Set default values
        validated_data['role'] = 'staff'
        validated_data['status'] = 'pending'
        validated_data['custom_permissions'] = []
        
        user = User.objects.create_user(password=password, **validated_data)
        return user




