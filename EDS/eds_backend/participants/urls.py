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
]

