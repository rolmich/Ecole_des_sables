from django.contrib import admin
from .models import Stage, Participant, Village, Bungalow


@admin.register(Stage)
class StageAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_date', 'end_date', 'instructor', 'capacity', 'current_participants', 'status']
    list_filter = ['start_date', 'end_date', 'created_at']
    search_fields = ['name', 'instructor']
    readonly_fields = ['current_participants', 'created_at', 'updated_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('name', 'instructor', 'capacity')
        }),
        ('Dates', {
            'fields': ('start_date', 'end_date')
        }),
        ('Contraintes', {
            'fields': ('constraints',)
        }),
        ('Statistiques', {
            'fields': ('current_participants',),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Participant)
class ParticipantAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'status', 'age', 'is_assigned', 'created_at']
    list_filter = ['status', 'gender', 'created_at']
    search_fields = ['first_name', 'last_name', 'email']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['last_name', 'first_name']
    filter_horizontal = ['stages']  # Pour une meilleure UI sur ManyToMany
    
    fieldsets = (
        ('Informations personnelles', {
            'fields': ('first_name', 'last_name', 'email', 'gender', 'age', 'language')
        }),
        ('Statut et Stages', {
            'fields': ('status', 'stages')
        }),
        ('Assignation', {
            'fields': ('assigned_bungalow', 'assigned_bed'),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Village)
class VillageAdmin(admin.ModelAdmin):
    list_display = ['name', 'amenities_type', 'total_bungalows', 'occupied_bungalows']
    list_filter = ['amenities_type']
    search_fields = ['name']
    ordering = ['name']
    
    def has_add_permission(self, request):
        # Empêcher l'ajout depuis l'admin (doit passer par populate_villages.py)
        return False
    
    def has_delete_permission(self, request, obj=None):
        # Empêcher la suppression depuis l'admin
        return False


@admin.register(Bungalow)
class BungalowAdmin(admin.ModelAdmin):
    list_display = ['name', 'village', 'type', 'capacity', 'occupancy', 'is_full', 'is_empty']
    list_filter = ['village', 'type']
    search_fields = ['name']
    readonly_fields = ['village', 'name', 'type', 'capacity', 'beds', 'amenities']
    ordering = ['village__name', 'name']
    
    def has_add_permission(self, request):
        # Empêcher l'ajout depuis l'admin (doit passer par populate_villages.py)
        return False
    
    def has_delete_permission(self, request, obj=None):
        # Empêcher la suppression depuis l'admin si occupé
        if obj and obj.occupancy > 0:
            return False
        return True
