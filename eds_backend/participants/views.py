from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, F
from django.utils import timezone

from .models import Stage, Participant, Village, Bungalow
from .serializers import (
    StageSerializer, StageCreateSerializer, StageUpdateSerializer, StageListSerializer,
    ParticipantSerializer, ParticipantCreateSerializer, ParticipantUpdateSerializer, ParticipantListSerializer,
    VillageSerializer, VillageListSerializer, BungalowSerializer, BungalowListSerializer
)
from .assignment_logic import (
    assign_participant_to_bungalow,
    validate_assignment,
    get_bungalow_availability,
    AssignmentError
)


# ==================== STAGE VIEWS ====================

class StageListCreateView(generics.ListCreateAPIView):
    """Vue pour lister et créer des stages."""
    
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'instructor']
    filterset_fields = []
    ordering_fields = ['name', 'start_date', 'end_date', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Retourne la queryset des stages."""
        return Stage.objects.all()
    
    def get_serializer_class(self):
        """Retourne le serializer approprié selon la méthode HTTP."""
        if self.request.method == 'POST':
            return StageCreateSerializer
        return StageListSerializer
    
    def perform_create(self, serializer):
        """Associe l'utilisateur connecté comme créateur."""
        serializer.save(created_by=self.request.user)


class StageRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """Vue pour récupérer, modifier et supprimer un stage."""
    
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Retourne la queryset des stages."""
        return Stage.objects.all()
    
    def get_serializer_class(self):
        """Retourne le serializer approprié selon la méthode HTTP."""
        if self.request.method in ['PUT', 'PATCH']:
            return StageUpdateSerializer
        return StageSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stage_statistics(request):
    """Retourne les statistiques des stages."""
    total_stages = Stage.objects.count()
    active_stages = Stage.objects.filter(
        start_date__lte=timezone.now().date(),
        end_date__gte=timezone.now().date()
    ).count()
    upcoming_stages = Stage.objects.filter(
        start_date__gt=timezone.now().date()
    ).count()
    completed_stages = Stage.objects.filter(
        end_date__lt=timezone.now().date()
    ).count()
    
    return Response({
        'total': total_stages,
        'active': active_stages,
        'upcoming': upcoming_stages,
        'completed': completed_stages
    })


# ==================== PARTICIPANT VIEWS ====================

class ParticipantListCreateView(generics.ListCreateAPIView):
    """Vue pour lister et créer des participants."""
    
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'email']
    filterset_fields = ['status', 'gender', 'language']
    ordering_fields = ['last_name', 'first_name', 'age', 'created_at']
    ordering = ['last_name', 'first_name']
    
    def get_queryset(self):
        """Retourne la queryset des participants avec filtres personnalisés."""
        queryset = Participant.objects.prefetch_related('stages').all()
        
        # Filtre par stage
        stage_id = self.request.query_params.get('stageId')
        if stage_id:
            queryset = queryset.filter(stages__id=stage_id)
        
        # Filtre par assignation
        assigned = self.request.query_params.get('assigned')
        if assigned is not None:
            if assigned.lower() == 'true':
                queryset = queryset.filter(assigned_bungalow__isnull=False)
            elif assigned.lower() == 'false':
                queryset = queryset.filter(assigned_bungalow__isnull=True)
        
        return queryset
    
    def get_serializer_class(self):
        """Retourne le serializer approprié selon la méthode HTTP."""
        if self.request.method == 'POST':
            return ParticipantCreateSerializer
        return ParticipantListSerializer
    
    def perform_create(self, serializer):
        """Associe l'utilisateur connecté comme créateur."""
        serializer.save(created_by=self.request.user)


class ParticipantRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """Vue pour récupérer, modifier et supprimer un participant."""
    
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Retourne la queryset des participants."""
        return Participant.objects.prefetch_related('stages').all()
    
    def get_serializer_class(self):
        """Retourne le serializer approprié selon la méthode HTTP."""
        if self.request.method in ['PUT', 'PATCH']:
            return ParticipantUpdateSerializer
        return ParticipantSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def participant_statistics(request):
    """Retourne les statistiques des participants."""
    total_participants = Participant.objects.count()
    assigned_participants = Participant.objects.filter(
        assigned_bungalow__isnull=False
    ).count()
    unassigned_participants = total_participants - assigned_participants
    
    # Statistiques par statut
    status_stats = {}
    for status, _ in Participant.STATUS_CHOICES:
        count = Participant.objects.filter(status=status).count()
        status_stats[status] = count
    
    # Statistiques par stage
    stage_stats = []
    for stage in Stage.objects.all():
        count = Participant.objects.filter(stages=stage).count()
        stage_stats.append({
            'stage_id': stage.id,
            'stage_name': stage.name,
            'participant_count': count,
            'capacity': stage.capacity,
            'occupancy_rate': round((count / stage.capacity * 100) if stage.capacity > 0 else 0, 2)
        })
    
    return Response({
        'total': total_participants,
        'assigned': assigned_participants,
        'unassigned': unassigned_participants,
        'by_status': status_stats,
        'by_stage': stage_stats
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_participant(request, participant_id):
    """Assigne un participant à un bungalow avec validation complète."""
    try:
        participant = Participant.objects.get(pk=participant_id)
    except Participant.DoesNotExist:
        return Response(
            {
                'error': f'ERREUR: Participant non trouvé (ID: {participant_id}). Vérifiez que le participant existe dans la base de données.',
                'participant_id': participant_id,
                'action': 'assign_participant'
            }, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    bungalow_id = request.data.get('bungalowId')
    bed_id = request.data.get('bed')
    stage_id = request.data.get('stageId')  # ID du stage pour l'assignation
    
    if not bungalow_id:
        return Response(
            {
                'error': 'ERREUR: ID du bungalow manquant. Vous devez fournir un "bungalowId" pour assigner le participant.',
                'participant': f'{participant.first_name} {participant.last_name}',
                'required_fields': ['bungalowId', 'bed', 'stageId']
            }, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not bed_id:
        return Response(
            {
                'error': 'ERREUR: ID du lit manquant. Vous devez fournir un "bed" (ex: "bed1") pour assigner le participant.',
                'participant': f'{participant.first_name} {participant.last_name}',
                'required_fields': ['bungalowId', 'bed', 'stageId']
            }, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not stage_id:
        return Response(
            {
                'error': 'ERREUR: ID du stage manquant. Vous devez fournir un "stageId" pour indiquer pour quel stage vous assignez ce participant.',
                'participant': f'{participant.first_name} {participant.last_name}',
                'required_fields': ['bungalowId', 'bed', 'stageId']
            }, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        bungalow = Bungalow.objects.get(pk=bungalow_id)
    except Bungalow.DoesNotExist:
        return Response(
            {
                'error': f'ERREUR: Bungalow non trouvé (ID: {bungalow_id}). Le bungalow demandé n\'existe pas dans la base de données.',
                'bungalow_id': bungalow_id,
                'action': 'assign_participant',
                'suggestion': 'Vérifiez que le bungalow existe ou synchronisez avec "python populate_villages.py"'
            }, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    try:
        stage = Stage.objects.get(pk=stage_id)
    except Stage.DoesNotExist:
        return Response(
            {
                'error': f'ERREUR: Stage non trouvé (ID: {stage_id}). Le stage demandé n\'existe pas.',
                'stage_id': stage_id,
                'action': 'assign_participant'
            }, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Utiliser la logique d'assignation avec toutes les validations
    success, message, details = assign_participant_to_bungalow(
        participant, bungalow, bed_id, stage
    )
    
    if success:
        serializer = ParticipantSerializer(participant)
        return Response({
            'success': True,
            'message': message,
            'participant': serializer.data,
            'details': details
        })
    else:
        return Response(
            {
                'error': message,
                'details': details
            },
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unassign_participant(request, participant_id):
    """Désassigne un participant de son bungalow."""
    try:
        participant = Participant.objects.get(pk=participant_id)
    except Participant.DoesNotExist:
        return Response(
            {
                'error': f'ERREUR: Participant non trouvé (ID: {participant_id}). Impossible de désassigner un participant inexistant.',
                'participant_id': participant_id,
                'action': 'unassign_participant'
            }, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    if not participant.is_assigned:
        return Response(
            {
                'error': f'ERREUR: Le participant {participant.full_name} n\'est PAS assigné à un bungalow. Impossible de désassigner quelqu\'un qui n\'est pas assigné.',
                'participant': participant.full_name,
                'is_assigned': False
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    old_bungalow = participant.assigned_bungalow
    old_bed = participant.assigned_bed
    
    participant.assigned_bungalow = None
    participant.assigned_bed = None
    participant.save()
    
    # Mettre à jour l'occupation du bungalow
    if old_bungalow:
        old_bungalow.update_occupancy()
    
    serializer = ParticipantSerializer(participant)
    return Response({
        'success': True,
        'message': f'Participant {participant.full_name} désassigné du bungalow {old_bungalow.name if old_bungalow else "inconnu"} (lit: {old_bed})',
        'participant': serializer.data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def participants_by_stage(request, stage_id):
    """Retourne tous les participants d'un stage."""
    try:
        stage = Stage.objects.get(pk=stage_id)
    except Stage.DoesNotExist:
        return Response(
            {
                'error': f'ERREUR: Stage non trouvé (ID: {stage_id}). Le stage demandé n\'existe pas dans la base de données.',
                'stage_id': stage_id,
                'action': 'get_participants_by_stage',
                'suggestion': 'Vérifiez l\'ID du stage ou créez-le d\'abord.'
            }, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    participants = Participant.objects.filter(stages=stage)
    serializer = ParticipantListSerializer(participants, many=True)
    
    return Response({
        'success': True,
        'stage': StageSerializer(stage).data,
        'participants': serializer.data,
        'count': participants.count(),
        'message': f'{participants.count()} participant(s) trouvé(s) pour le stage "{stage.name}"'
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unassigned_participants(request):
    """Retourne tous les participants non assignés."""
    participants = Participant.objects.filter(assigned_bungalow__isnull=True)
    serializer = ParticipantListSerializer(participants, many=True)
    
    return Response({
        'participants': serializer.data,
        'count': participants.count()
    })


# ==================== VILLAGE VIEWS ====================

class VillageListView(generics.ListAPIView):
    """Vue pour lister les villages (lecture seule)."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = VillageListSerializer
    
    def get_queryset(self):
        """Retourne tous les villages."""
        return Village.objects.all()


class VillageRetrieveView(generics.RetrieveAPIView):
    """Vue pour récupérer un village avec ses bungalows (lecture seule)."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = VillageSerializer
    
    def get_queryset(self):
        """Retourne tous les villages."""
        return Village.objects.prefetch_related('bungalows').all()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def village_statistics(request):
    """Retourne les statistiques des villages."""
    total_villages = Village.objects.count()
    total_bungalows = Bungalow.objects.count()
    occupied_bungalows = Bungalow.objects.filter(occupancy__gt=0).count()
    empty_bungalows = total_bungalows - occupied_bungalows
    
    # Statistiques par village
    village_stats = []
    for village in Village.objects.all():
        total = village.bungalows.count()
        occupied = village.bungalows.filter(occupancy__gt=0).count()
        village_stats.append({
            'village_name': village.name,
            'total_bungalows': total,
            'occupied_bungalows': occupied,
            'empty_bungalows': total - occupied,
            'occupancy_rate': round((occupied / total * 100) if total > 0 else 0, 2),
            'amenities_type': village.get_amenities_type_display()
        })
    
    return Response({
        'total_villages': total_villages,
        'total_bungalows': total_bungalows,
        'occupied_bungalows': occupied_bungalows,
        'empty_bungalows': empty_bungalows,
        'by_village': village_stats
    })


# ==================== BUNGALOW VIEWS ====================

class BungalowListView(generics.ListAPIView):
    """Vue pour lister les bungalows (lecture seule)."""
    
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    filterset_fields = ['village__name', 'type']
    ordering_fields = ['name', 'village__name', 'occupancy']
    ordering = ['village__name', 'name']
    
    def get_queryset(self):
        """Retourne tous les bungalows avec filtres personnalisés."""
        queryset = Bungalow.objects.select_related('village').all()
        
        # Filtre par village
        village = self.request.query_params.get('village')
        if village:
            queryset = queryset.filter(village__name=village)
        
        # Filtre par disponibilité
        available = self.request.query_params.get('available')
        if available is not None:
            if available.lower() == 'true':
                queryset = queryset.filter(occupancy__lt=F('capacity'))
            elif available.lower() == 'false':
                queryset = queryset.filter(occupancy__gte=F('capacity'))
        
        return queryset
    
    def get_serializer_class(self):
        """Retourne le serializer approprié."""
        return BungalowListSerializer


class BungalowRetrieveView(generics.RetrieveAPIView):
    """Vue pour récupérer un bungalow (lecture seule)."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = BungalowSerializer
    
    def get_queryset(self):
        """Retourne tous les bungalows."""
        return Bungalow.objects.select_related('village').all()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def bungalow_details(request, bungalow_id):
    """Retourne les détails d'un bungalow avec les participants assignés."""
    try:
        bungalow = Bungalow.objects.select_related('village').get(pk=bungalow_id)
    except Bungalow.DoesNotExist:
        return Response(
            {
                'error': f'ERREUR: Bungalow non trouvé (ID: {bungalow_id}). Le bungalow demandé n\'existe pas.',
                'bungalow_id': bungalow_id,
                'action': 'get_bungalow_details',
                'suggestion': 'Vérifiez l\'ID ou synchronisez les bungalows avec "python populate_villages.py"'
            }, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Récupérer les participants assignés à ce bungalow
    participants = Participant.objects.filter(assigned_bungalow=bungalow)
    
    return Response({
        'success': True,
        'bungalow': BungalowSerializer(bungalow).data,
        'participants': ParticipantListSerializer(participants, many=True).data,
        'message': f'{participants.count()} participant(s) assigné(s) au bungalow {bungalow.name}'
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def bungalows_by_village(request, village_name):
    """Retourne tous les bungalows d'un village."""
    try:
        village = Village.objects.get(name=village_name)
    except Village.DoesNotExist:
        available_villages = [v.name for v in Village.objects.all()]
        return Response(
            {
                'error': f'ERREUR: Village "{village_name}" non trouvé. Le village demandé n\'existe pas.',
                'village_name': village_name,
                'available_villages': available_villages,
                'action': 'get_bungalows_by_village',
                'suggestion': f'Villages disponibles: {", ".join(available_villages) if available_villages else "Aucun"}'
            }, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    bungalows = Bungalow.objects.filter(village=village)
    serializer = BungalowSerializer(bungalows, many=True)
    
    return Response({
        'success': True,
        'village': VillageSerializer(village).data,
        'bungalows': serializer.data,
        'count': bungalows.count(),
        'message': f'{bungalows.count()} bungalow(s) trouvé(s) dans le village {village_name}'
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_bungalows(request):
    """Retourne tous les bungalows avec des lits disponibles."""
    bungalows = Bungalow.objects.select_related('village').filter(
        occupancy__lt=F('capacity')
    ).order_by('village__name', 'name')
    
    serializer = BungalowSerializer(bungalows, many=True)
    
    return Response({
        'bungalows': serializer.data,
        'count': bungalows.count()
    })
