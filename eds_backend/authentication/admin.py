from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom admin for User model."""
    
    list_display = ['email', 'username', 'first_name', 'last_name', 'role', 'status', 'created_at']
    list_filter = ['role', 'status', 'is_active', 'created_at']
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('email', 'username', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'phone')}),
        ('Permissions', {'fields': ('role', 'department', 'custom_permissions', 'is_active', 'is_staff', 'is_superuser')}),
        ('Status', {'fields': ('status',)}),
        ('Tracking', {'fields': ('last_login', 'created_at', 'created_by', 'updated_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'first_name', 'last_name', 'password1', 'password2', 'role', 'status'),
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at', 'last_login']
