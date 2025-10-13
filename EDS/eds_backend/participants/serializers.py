from rest_framework import serializers
from .models import Stage, Participant, Village, Bungalow


class StageSerializer(serializers.ModelSerializer):
    """Serializer pour Stage correspondant à l'interface TypeScript."""
    
    # Mapping des champs pour correspondre au frontend React
    startDate = serializers.DateField(source='start_date')
    endDate = serializers.DateField(source='end_date')
    instructor = serializers.CharField()
    currentParticipants = serializers.IntegerField(source='current_participants')
    constraints = serializers.JSONField()
    
    # Champs calculés
    status = serializers.ReadOnlyField()
    progressPercentage = serializers.ReadOnlyField(source='progress_percentage')
    isActive = serializers.ReadOnlyField(source='is_active')
    isUpcoming = serializers.ReadOnlyField(source='is_upcoming')
    isCompleted = serializers.ReadOnlyField(source='is_completed')
    assignedParticipantsCount = serializers.ReadOnlyField(source='assigned_participants_count')
    assignedBungalowsCount = serializers.ReadOnlyField(source='assigned_bungalows_count')
    
    class Meta:
        model = Stage
        fields = [
            'id', 'name', 'startDate', 'endDate', 'instructor', 
            'capacity', 'currentParticipants', 'constraints',
            'status', 'progressPercentage', 'isActive', 'isUpcoming', 'isCompleted',
            'assignedParticipantsCount', 'assignedBungalowsCount',
            'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = ['id', 'current_participants', 'created_at', 'updated_at', 'created_by']


class StageCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de Stage."""
    
    startDate = serializers.DateField(source='start_date')
    endDate = serializers.DateField(source='end_date')
    constraints = serializers.JSONField(default=list)
    
    class Meta:
        model = Stage
        fields = [
            'name', 'startDate', 'endDate', 'instructor', 
            'capacity', 'constraints'
        ]
    
    def validate(self, data):
        """Validation des données de stage."""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError({
                'endDate': f'ERREUR: La date de fin ({end_date}) doit être APRÈS la date de début ({start_date}). Veuillez choisir une date de fin ultérieure.'
            })
        
        capacity = data.get('capacity', 0)
        if capacity <= 0:
            raise serializers.ValidationError({
                'capacity': f'ERREUR: La capacité ({capacity}) doit être supérieure à 0. Veuillez saisir un nombre positif de participants.'
            })
        
        return data


class StageUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour la mise à jour de Stage."""
    
    startDate = serializers.DateField(source='start_date', required=False)
    endDate = serializers.DateField(source='end_date', required=False)
    constraints = serializers.JSONField(required=False)
    
    class Meta:
        model = Stage
        fields = [
            'name', 'startDate', 'endDate', 'instructor', 
            'capacity', 'constraints'
        ]
    
    def validate(self, data):
        """Validation des données de stage."""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        # Vérifier si des participants sont assignés à des bungalows pour ce stage
        if (start_date or end_date) and self.instance:
            assigned_participants = self.instance.participants.filter(assigned_bungalow__isnull=False)
            if assigned_participants.exists():
                participant_names = ', '.join([f"{p.first_name} {p.last_name}" for p in assigned_participants[:3]])
                count = assigned_participants.count()
                raise serializers.ValidationError({
                    'dates': f'🚫 IMPOSSIBLE DE MODIFIER LES DATES: Ce stage a {count} participant(s) assigné(s) à des bungalows ({participant_names}{"..." if count > 3 else ""}). Vous devez d\'abord désassigner tous les participants avant de modifier les dates du stage.'
                })
        
        # Si les deux dates sont fournies, vérifier la cohérence
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError({
                'endDate': 'ERREUR: La date de fin doit être APRÈS la date de début. Veuillez choisir une date de fin ultérieure.'
            })
        
        # Si une seule date est fournie, récupérer l'autre depuis l'instance
        if start_date and not end_date:
            end_date = self.instance.end_date
        elif end_date and not start_date:
            start_date = self.instance.start_date
        
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError({
                'endDate': 'ERREUR: La date de fin doit être APRÈS la date de début. Veuillez choisir une date de fin ultérieure.'
            })
        
        if 'capacity' in data and data['capacity'] <= 0:
            raise serializers.ValidationError({
                'capacity': 'ERREUR: La capacité doit être supérieure à 0. Veuillez saisir un nombre positif.'
            })
        
        return data


class ParticipantSerializer(serializers.ModelSerializer):
    """Serializer pour Participant correspondant à l'interface TypeScript."""
    
    # Mapping des champs pour correspondre au frontend React
    firstName = serializers.CharField(source='first_name')
    lastName = serializers.CharField(source='last_name')
    stageIds = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=Stage.objects.all(),
        source='stages',
        required=False
    )
    assignedBungalowId = serializers.IntegerField(source='assigned_bungalow.id', allow_null=True, read_only=True)
    assignedBed = serializers.CharField(source='assigned_bed', allow_null=True)
    
    # Champs calculés
    fullName = serializers.ReadOnlyField(source='full_name')
    isAssigned = serializers.ReadOnlyField(source='is_assigned')
    
    class Meta:
        model = Participant
        fields = [
            'id', 'firstName', 'lastName', 'email', 'gender', 'age', 
            'language', 'status', 'stageIds', 'assignedBungalowId', 'assignedBed',
            'fullName', 'isAssigned',
            'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']


class ParticipantCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de Participant."""
    
    firstName = serializers.CharField(source='first_name')
    lastName = serializers.CharField(source='last_name')
    stageIds = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Stage.objects.all(),
        source='stages',
        required=False,
        error_messages={
            'does_not_exist': '🎓 STAGE INVALIDE: Le stage sélectionné (ID: {pk_value}) n\'existe pas ou a été supprimé. Veuillez rafraîchir la page et sélectionner un stage dans la liste.',
            'incorrect_type': '🎓 STAGE INVALIDE: Le format du stage est incorrect.',
        }
    )
    
    class Meta:
        model = Participant
        fields = [
            'firstName', 'lastName', 'email', 'gender', 'age', 
            'language', 'status', 'stageIds'
        ]
    
    def validate_stageIds(self, value):
        """Validation personnalisée pour les stage IDs."""
        if not value or len(value) == 0:
            raise serializers.ValidationError(
                '⚠️ ERREUR: Vous devez sélectionner AU MOINS UN STAGE pour le participant. '
                'Un participant doit obligatoirement être inscrit à au moins un stage de formation.'
            )
        return value
    
    def validate(self, data):
        """Validation des données de participant."""
        email = data.get('email')
        stages = data.get('stages', [])
        
        # Vérifier que l'email n'est pas déjà utilisé DANS LES MÊMES STAGES
        if email and stages:
            for stage in stages:
                # Chercher si cet email existe déjà pour ce stage
                existing = Participant.objects.filter(
                    email=email,
                    stages=stage
                )
                
                if self.instance:
                    existing = existing.exclude(pk=self.instance.pk)
                
                if existing.exists():
                    existing_participant = existing.first()
                    raise serializers.ValidationError({
                        'email': f'ERREUR: L\'email "{email}" est déjà utilisé par {existing_participant.first_name} {existing_participant.last_name} (ID: {existing_participant.id}) dans le stage "{stage.name}". Le même email ne peut pas être utilisé deux fois dans le même stage. Vous pouvez utiliser le même email pour des stages DIFFÉRENTS.'
                    })
        
        # Validation de l'âge
        age = data.get('age', 0)
        if age < 16:
            raise serializers.ValidationError({
                'age': f'⚠️ ÂGE TROP JEUNE: L\'âge saisi est {age} ans. Les participants doivent avoir AU MOINS 16 ans. Veuillez vérifier l\'âge saisi.'
            })
        if age > 80:
            raise serializers.ValidationError({
                'age': f'⚠️ ÂGE INVALIDE: L\'âge saisi est {age} ans. L\'âge maximum accepté est 80 ans. Veuillez vérifier l\'âge saisi.'
            })
        
        # Validation des stages - vérifier la capacité
        if stages:
            for stage in stages:
                if stage.current_participants >= stage.capacity:
                    raise serializers.ValidationError({
                        'stageIds': f'🎓 STAGE COMPLET: Le stage "{stage.name}" est COMPLET. Il a {stage.capacity} places et toutes sont déjà prises ({stage.current_participants} participants inscrits). Vous ne pouvez plus ajouter de participants à ce stage. Veuillez choisir un autre stage qui a encore des places disponibles, ou demandez à l\'administrateur d\'augmenter la capacité du stage.'
                    })
        else:
            # Si aucun stage n'est fourni après toutes les validations
            raise serializers.ValidationError({
                'stageIds': '⚠️ ERREUR: Vous devez sélectionner AU MOINS UN STAGE pour le participant. Un participant doit obligatoirement être inscrit à au moins un stage de formation.'
            })
        
        return data
    
    def create(self, validated_data):
        """Créer un participant avec gestion ManyToMany."""
        # Extraire les stages avant de créer l'instance
        stages = validated_data.pop('stages', [])
        
        # Vérifier qu'au moins un stage est fourni
        if not stages or len(stages) == 0:
            raise serializers.ValidationError({
                'stageIds': '⚠️ ERREUR: Vous devez sélectionner AU MOINS UN STAGE pour le participant. Un participant doit obligatoirement être inscrit à au moins un stage de formation.'
            })
        
        # Créer le participant
        participant = Participant.objects.create(**validated_data)
        
        # Assigner les stages après la création
        participant.stages.set(stages)
        
        return participant


class ParticipantUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour la mise à jour de Participant."""
    
    firstName = serializers.CharField(source='first_name', required=False)
    lastName = serializers.CharField(source='last_name', required=False)
    stageIds = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Stage.objects.all(),
        source='stages',
        required=False,
        error_messages={
            'does_not_exist': '🎓 STAGE INVALIDE: Le stage sélectionné (ID: {pk_value}) n\'existe pas ou a été supprimé. Veuillez rafraîchir la page et sélectionner un stage dans la liste.',
            'incorrect_type': '🎓 STAGE INVALIDE: Le format du stage est incorrect.',
        }
    )
    assignedBungalowId = serializers.PrimaryKeyRelatedField(
        queryset=Bungalow.objects.all(),
        source='assigned_bungalow',
        required=False,
        allow_null=True
    )
    assignedBed = serializers.CharField(source='assigned_bed', required=False, allow_null=True)
    
    class Meta:
        model = Participant
        fields = [
            'firstName', 'lastName', 'email', 'gender', 'age', 
            'language', 'status', 'stageIds', 'assignedBungalowId', 'assignedBed'
        ]
    
    def validate_stageIds(self, value):
        """Validation personnalisée pour les stage IDs lors de la mise à jour."""
        if value is not None and len(value) == 0:
            raise serializers.ValidationError(
                '⚠️ ERREUR: Vous devez sélectionner AU MOINS UN STAGE pour le participant. '
                'Un participant doit obligatoirement être inscrit à au moins un stage de formation.'
            )
        
        # Vérifier si le participant est assigné à un bungalow
        if self.instance and self.instance.assigned_bungalow:
            raise serializers.ValidationError(
                f'🚫 MODIFICATION INTERDITE: Ce participant est actuellement assigné au bungalow {self.instance.assigned_bungalow.name}. Vous ne pouvez PAS modifier ses stages tant qu\'il est assigné à une chambre. Vous devez d\'abord le désassigner avant de pouvoir modifier ses stages.'
            )
        
        return value
    
    def validate(self, data):
        """Validation des données de participant."""
        email = data.get('email')
        stages = data.get('stages')
        
        # Vérifier que l'email n'est pas déjà utilisé DANS LES MÊMES STAGES
        if email and stages:
            for stage in stages:
                # Chercher si cet email existe déjà pour ce stage
                existing = Participant.objects.filter(
                    email=email,
                    stages=stage
                ).exclude(pk=self.instance.pk)
                
                if existing.exists():
                    existing_participant = existing.first()
                    raise serializers.ValidationError({
                        'email': f'ERREUR: L\'email "{email}" est déjà utilisé par {existing_participant.first_name} {existing_participant.last_name} (ID: {existing_participant.id}) dans le stage "{stage.name}". Le même email ne peut pas être utilisé deux fois dans le même stage. Vous pouvez utiliser le même email pour des stages DIFFÉRENTS.'
                    })
        
        # Validation de l'âge
        age = data.get('age')
        if age is not None:
            if age < 16:
                raise serializers.ValidationError({
                    'age': f'⚠️ ÂGE TROP JEUNE: L\'âge saisi est {age} ans. Les participants doivent avoir AU MOINS 16 ans. Veuillez vérifier l\'âge saisi.'
                })
            if age > 80:
                raise serializers.ValidationError({
                    'age': f'⚠️ ÂGE INVALIDE: L\'âge saisi est {age} ans. L\'âge maximum accepté est 80 ans. Veuillez vérifier l\'âge saisi.'
                })
        
        # Validation des stages - vérifier la capacité
        if stages:
            for stage in stages:
                if stage.current_participants >= stage.capacity:
                    raise serializers.ValidationError({
                        'stageIds': f'🎓 STAGE COMPLET: Le stage "{stage.name}" est COMPLET. Il a {stage.capacity} places et toutes sont déjà prises ({stage.current_participants} participants inscrits). Vous ne pouvez plus ajouter de participants à ce stage. Veuillez choisir un autre stage qui a encore des places disponibles, ou demandez à l\'administrateur d\'augmenter la capacité du stage.'
                    })
        
        return data
    
    def update(self, instance, validated_data):
        """Mettre à jour un participant avec gestion ManyToMany."""
        # Extraire les stages si présents
        stages = validated_data.pop('stages', None)
        
        # Mettre à jour les autres champs
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Mettre à jour les stages si fournis
        if stages is not None:
            instance.stages.set(stages)
        
        return instance


class ParticipantListSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour la liste des participants."""
    
    firstName = serializers.CharField(source='first_name')
    lastName = serializers.CharField(source='last_name')
    stageIds = serializers.PrimaryKeyRelatedField(many=True, read_only=True, source='stages')
    assignedBungalowId = serializers.IntegerField(source='assigned_bungalow.id', allow_null=True, read_only=True)
    assignedBed = serializers.CharField(source='assigned_bed', allow_null=True)
    isAssigned = serializers.ReadOnlyField(source='is_assigned')
    
    class Meta:
        model = Participant
        fields = [
            'id', 'firstName', 'lastName', 'email', 'gender', 'age', 
            'language', 'status', 'stageIds', 
            'assignedBungalowId', 'assignedBed', 'isAssigned'
        ]


class StageListSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour la liste des stages."""
    
    startDate = serializers.DateField(source='start_date')
    endDate = serializers.DateField(source='end_date')
    currentParticipants = serializers.IntegerField(source='current_participants')
    constraints = serializers.JSONField()
    status = serializers.ReadOnlyField()
    progressPercentage = serializers.ReadOnlyField(source='progress_percentage')
    
    class Meta:
        model = Stage
        fields = [
            'id', 'name', 'startDate', 'endDate', 'instructor', 
            'capacity', 'currentParticipants', 'constraints',
            'status', 'progressPercentage'
        ]


class BungalowSerializer(serializers.ModelSerializer):
    """Serializer pour Bungalow correspondant à l'interface TypeScript."""
    
    # Mapping pour correspondre au frontend React
    village = serializers.CharField(source='village.name')
    
    # Champs calculés
    isFull = serializers.ReadOnlyField(source='is_full')
    isEmpty = serializers.ReadOnlyField(source='is_empty')
    availableBeds = serializers.ReadOnlyField(source='available_beds')
    
    class Meta:
        model = Bungalow
        fields = [
            'id', 'name', 'village', 'type', 'capacity', 
            'occupancy', 'beds', 'amenities',
            'isFull', 'isEmpty', 'availableBeds'
        ]
        read_only_fields = ['id', 'name', 'village', 'type', 'capacity', 'beds', 'amenities', 'occupancy']


class BungalowListSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour la liste des bungalows."""
    
    village = serializers.CharField(source='village.name')
    
    class Meta:
        model = Bungalow
        fields = [
            'id', 'name', 'village', 'type', 'capacity', 'occupancy'
        ]


class VillageSerializer(serializers.ModelSerializer):
    """Serializer pour Village avec les bungalows."""
    
    # Mapping pour correspondre au frontend React
    amenitiesType = serializers.CharField(source='amenities_type')
    
    # Inclure les bungalows
    bungalows = BungalowSerializer(many=True, read_only=True)
    
    # Champs calculés
    totalBungalows = serializers.ReadOnlyField(source='total_bungalows')
    occupiedBungalows = serializers.ReadOnlyField(source='occupied_bungalows')
    
    class Meta:
        model = Village
        fields = [
            'id', 'name', 'amenitiesType', 'bungalows',
            'totalBungalows', 'occupiedBungalows'
        ]
        read_only_fields = ['id', 'name', 'amenitiesType']


class VillageListSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour la liste des villages."""
    
    amenitiesType = serializers.CharField(source='amenities_type')
    totalBungalows = serializers.ReadOnlyField(source='total_bungalows')
    occupiedBungalows = serializers.ReadOnlyField(source='occupied_bungalows')
    
    class Meta:
        model = Village
        fields = [
            'id', 'name', 'amenitiesType', 'totalBungalows', 'occupiedBungalows'
        ]

