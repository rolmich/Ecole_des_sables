from django.urls import path
from . import views

app_name = 'participants'

urlpatterns = [
    # ==================== STAGE URLS ====================
    
    # CRUD Stages
    path('stages/', views.StageListCreateView.as_view(), name='stage-list-create'),
    path('stages/<int:pk>/', views.StageRetrieveUpdateDestroyView.as_view(), name='stage-detail'),
    
    # Statistiques Stages
    path('stages/statistics/', views.stage_statistics, name='stage-statistics'),
    
    # ==================== PARTICIPANT URLS ====================
    
    # CRUD Participants
    path('participants/', views.ParticipantListCreateView.as_view(), name='participant-list-create'),
    path('participants/<int:pk>/', views.ParticipantRetrieveUpdateDestroyView.as_view(), name='participant-detail'),
    
    # Statistiques Participants
    path('participants/statistics/', views.participant_statistics, name='participant-statistics'),
    
    # Participants par stage
    path('participants/by-stage/<int:stage_id>/', views.participants_by_stage, name='participants-by-stage'),
    
    # Participants non assignés
    path('participants/unassigned/', views.unassigned_participants, name='unassigned-participants'),
    
    # Assignation/Désassignation
    path('participants/<int:participant_id>/assign/', views.assign_participant, name='assign-participant'),
    path('participants/<int:participant_id>/unassign/', views.unassign_participant, name='unassign-participant'),
    
    # ==================== VILLAGE URLS ====================
    
    # Liste et détails Villages (lecture seule)
    path('villages/', views.VillageListView.as_view(), name='village-list'),
    path('villages/<int:pk>/', views.VillageRetrieveView.as_view(), name='village-detail'),
    
    # Statistiques Villages
    path('villages/statistics/', views.village_statistics, name='village-statistics'),
    
    # Bungalows par village
    path('villages/<str:village_name>/bungalows/', views.bungalows_by_village, name='bungalows-by-village'),
    
    # ==================== BUNGALOW URLS ====================
    
    # Liste et détails Bungalows (lecture seule)
    path('bungalows/', views.BungalowListView.as_view(), name='bungalow-list'),
    path('bungalows/<int:pk>/', views.BungalowRetrieveView.as_view(), name='bungalow-detail'),
    
    # Détails bungalow avec participants
    path('bungalows/<int:bungalow_id>/details/', views.bungalow_details, name='bungalow-details'),
    
    # Bungalows disponibles
    path('bungalows/available/', views.available_bungalows, name='available-bungalows'),

    # ==================== LANGUAGE URLS ====================

    # CRUD Languages
    path('languages/', views.LanguageListCreateView.as_view(), name='language-list-create'),
    path('languages/<int:pk>/', views.LanguageRetrieveUpdateDestroyView.as_view(), name='language-detail'),

    # Statistiques Languages
    path('languages/statistics/', views.language_statistics, name='language-statistics'),

    # ==================== ACTIVITY LOG URLS ====================

    # Liste des activités
    path('activity-logs/', views.ActivityLogListView.as_view(), name='activity-log-list'),

    # Statistiques des activités
    path('activity-logs/statistics/', views.activity_log_stats, name='activity-log-stats'),

    # ==================== PARTICIPANT STAGE URLS (inscriptions) ====================

    # Liste et création des inscriptions participant-stage
    path('participant-stages/', views.ParticipantStageListCreateView.as_view(), name='participant-stage-list-create'),

    # Détail, modification, suppression d'une inscription
    path('participant-stages/<int:pk>/', views.ParticipantStageDetailView.as_view(), name='participant-stage-detail'),

    # Participants d'un événement spécifique
    path('stages/<int:stage_id>/participants/', views.StageParticipantsView.as_view(), name='stage-participants'),

    # Statistiques des participants d'un événement
    path('stages/<int:stage_id>/participants/stats/', views.stage_participants_stats, name='stage-participants-stats'),

    # ==================== PARTICIPANT SIMPLE URLS (sans événement) ====================

    # Liste et création de participants (indépendant des événements)
    path('participants-directory/', views.ParticipantSimpleListCreateView.as_view(), name='participant-directory'),

    # Recherche de participants (pour ajout à un événement)
    path('participants/search/', views.search_participants, name='search-participants'),

    # ==================== REGISTRATION ASSIGNMENT URLS (inscriptions aux bungalows) ====================

    # Inscriptions non assignées (pour la page Assignation)
    path('registrations/unassigned/', views.unassigned_registrations, name='unassigned-registrations'),

    # Assignation/Désassignation d'une inscription
    path('registrations/<int:registration_id>/assign/', views.assign_registration, name='assign-registration'),
    path('registrations/<int:registration_id>/unassign/', views.unassign_registration, name='unassign-registration'),

    # Export des assignations
    path('registrations/export/', views.export_assignments, name='export-assignments'),

    # ==================== EXCEL IMPORT URLS ====================

    # Validation d'un fichier Excel (preview)
    path('import/validate/', views.validate_excel_import, name='validate-excel-import'),

    # Exécution de l'import
    path('import/execute/', views.execute_excel_import, name='execute-excel-import'),

    # ==================== REPORTS / BILANS URLS ====================

    # Bilan de fréquentation
    path('reports/frequency/', views.frequency_report, name='frequency-report'),

    # ==================== DASHBOARD URLS ====================

    # Statistiques du tableau de bord
    path('dashboard/stats/', views.dashboard_stats, name='dashboard-stats'),
]

