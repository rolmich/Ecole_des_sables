from django.contrib import admin
from .models import Stage, Participant, Village, Bungalow, Language, ParticipantStage


class ParticipantStageInline(admin.TabularInline):
    """Inline pour afficher les inscriptions d'un participant aux événements."""
    model = ParticipantStage
    extra = 0
    readonly_fields = ['created_at']
    fields = ['stage', 'role', 'arrival_date', 'arrival_time', 'departure_date', 'departure_time', 'notes']


class StageParticipantInline(admin.TabularInline):
    """Inline pour afficher les participants d'un événement."""
    model = ParticipantStage
    extra = 0
    readonly_fields = ['created_at']
    fields = ['participant', 'role', 'arrival_date', 'arrival_time', 'departure_date', 'departure_time', 'notes']


@admin.register(Stage)
class StageAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_date', 'end_date', 'event_type', 'instructor', 'capacity', 'current_participants', 'status']
    list_filter = ['event_type', 'start_date', 'end_date', 'created_at']
    search_fields = ['name', 'instructor']
    readonly_fields = ['current_participants', 'created_at', 'updated_at']
    ordering = ['-created_at']
    inlines = [StageParticipantInline]

    fieldsets = (
        ('Informations générales', {
            'fields': ('name', 'event_type', 'instructor', 'instructor2', 'instructor3', 'capacity', 'musicians_count')
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
    list_display = ['full_name', 'email', 'nationality', 'status', 'age', 'is_assigned', 'stage_count', 'created_at']
    list_filter = ['status', 'gender', 'nationality', 'created_at']
    search_fields = ['first_name', 'last_name', 'email', 'nationality']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['last_name', 'first_name']
    filter_horizontal = ['languages']
    inlines = [ParticipantStageInline]

    fieldsets = (
        ('Informations personnelles', {
            'fields': ('first_name', 'last_name', 'email', 'gender', 'age', 'nationality', 'language')
        }),
        ('Langues et Statut', {
            'fields': ('status', 'languages')
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

    def stage_count(self, obj):
        """Nombre d'événements auxquels le participant est inscrit."""
        return obj.stage_participations.count()
    stage_count.short_description = 'Événements'


@admin.register(ParticipantStage)
class ParticipantStageAdmin(admin.ModelAdmin):
    list_display = ['participant', 'stage', 'role', 'arrival_date', 'departure_date', 'created_at']
    list_filter = ['role', 'stage', 'arrival_date', 'created_at']
    search_fields = ['participant__first_name', 'participant__last_name', 'stage__name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    autocomplete_fields = ['participant', 'stage']

    fieldsets = (
        ('Inscription', {
            'fields': ('participant', 'stage', 'role')
        }),
        ('Dates et heures', {
            'fields': ('arrival_date', 'arrival_time', 'departure_date', 'departure_time')
        }),
        ('Notes', {
            'fields': ('notes',)
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


@admin.register(Language)
class LanguageAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'native_name', 'is_active', 'display_order', 'participant_count', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'code', 'native_name']
    readonly_fields = ['created_at', 'updated_at', 'participant_count']
    ordering = ['display_order', 'name']

    fieldsets = (
        ('Informations de la langue', {
            'fields': ('code', 'name', 'native_name')
        }),
        ('Paramètres', {
            'fields': ('is_active', 'display_order')
        }),
        ('Statistiques', {
            'fields': ('participant_count',),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def participant_count(self, obj):
        """Affiche le nombre de participants utilisant cette langue."""
        return obj.participant_count
    participant_count.short_description = 'Nombre de participants'
