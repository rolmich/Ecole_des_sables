from rest_framework import serializers
from .models import Stage, Participant, Village, Bungalow, Language, ActivityLog, ParticipantStage


class StageSerializer(serializers.ModelSerializer):
    """Serializer pour Stage correspondant à l'interface TypeScript."""

    # Mapping des champs pour correspondre au frontend React
    startDate = serializers.DateField(source='start_date')
    endDate = serializers.DateField(source='end_date')
    eventType = serializers.CharField(source='event_type')
    instructor = serializers.CharField(required=False, allow_blank=True)
    instructor2 = serializers.CharField(required=False, allow_blank=True)
    instructor3 = serializers.CharField(required=False, allow_blank=True)
    currentParticipants = serializers.SerializerMethodField()
    musiciansCount = serializers.IntegerField(source='musicians_count')
    constraints = serializers.JSONField()

    def get_currentParticipants(self, obj):
        """Calcule le nombre réel de participants inscrits à cet événement."""
        return ParticipantStage.objects.filter(stage=obj).count()

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
            'id', 'name', 'startDate', 'endDate', 'eventType', 'instructor', 'instructor2', 'instructor3',
            'capacity', 'currentParticipants', 'musiciansCount', 'constraints',
            'status', 'progressPercentage', 'isActive', 'isUpcoming', 'isCompleted',
            'assignedParticipantsCount', 'assignedBungalowsCount',
            'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = ['id', 'current_participants', 'created_at', 'updated_at', 'created_by']


class StageCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de Stage."""

    startDate = serializers.DateField(source='start_date')
    endDate = serializers.DateField(source='end_date')
    eventType = serializers.CharField(source='event_type', default='stage')
    instructor = serializers.CharField(required=False, allow_blank=True)
    instructor2 = serializers.CharField(required=False, allow_blank=True)
    instructor3 = serializers.CharField(required=False, allow_blank=True)
    musiciansCount = serializers.IntegerField(source='musicians_count', default=0)
    constraints = serializers.JSONField(default=list)

    class Meta:
        model = Stage
        fields = [
            'name', 'startDate', 'endDate', 'eventType', 'instructor', 'instructor2', 'instructor3',
            'capacity', 'musiciansCount', 'constraints'
        ]
    
    def validate(self, data):
        """Validation des données de stage."""
        import math
        from django.db.models import Q

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

        # Vérification de la capacité des chambres
        if start_date and end_date:
            participants = capacity
            musicians = data.get('musicians_count', 0)

            # Calcul du nombre de chambres nécessaires: ceil(participants/3) + ceil(musiciens/3) + 1
            rooms_needed = math.ceil(participants / 3) + math.ceil(musicians / 3) + 1

            # Trouver les événements qui se chevauchent
            overlapping_stages = Stage.objects.filter(
                Q(start_date__lte=end_date) & Q(end_date__gte=start_date)
            )

            # Calculer les chambres occupées par les événements qui se chevauchent
            total_rooms_used = rooms_needed
            for stage in overlapping_stages:
                stage_rooms = math.ceil(stage.capacity / 3) + math.ceil(stage.musicians_count / 3) + 1
                total_rooms_used += stage_rooms

            # Nombre total de chambres disponibles (selon configuration)
            total_available_rooms = Bungalow.objects.count()

            # Si dépassement, ajouter un avertissement (warning, pas erreur)
            if total_rooms_used > total_available_rooms:
                data['_capacity_warning'] = {
                    'rooms_needed': rooms_needed,
                    'total_rooms_used': total_rooms_used,
                    'total_available': total_available_rooms,
                    'overlapping_events': overlapping_stages.count()
                }

        return data


class StageUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour la mise à jour de Stage."""

    startDate = serializers.DateField(source='start_date', required=False)
    endDate = serializers.DateField(source='end_date', required=False)
    eventType = serializers.CharField(source='event_type', required=False)
    instructor = serializers.CharField(required=False, allow_blank=True)
    instructor2 = serializers.CharField(required=False, allow_blank=True)
    instructor3 = serializers.CharField(required=False, allow_blank=True)
    musiciansCount = serializers.IntegerField(source='musicians_count', required=False)
    constraints = serializers.JSONField(required=False)

    class Meta:
        model = Stage
        fields = [
            'name', 'startDate', 'endDate', 'eventType', 'instructor', 'instructor2', 'instructor3',
            'capacity', 'musiciansCount', 'constraints'
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
    # stageIds calculé à partir de ParticipantStage pour compatibilité
    stageIds = serializers.SerializerMethodField()
    languageIds = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Language.objects.all(),
        source='languages',
        required=False
    )
    assignedBungalowId = serializers.SerializerMethodField()
    assignedBed = serializers.CharField(source='assigned_bed', allow_null=True, read_only=True)

    # Champs calculés
    fullName = serializers.ReadOnlyField(source='full_name')
    isAssigned = serializers.ReadOnlyField(source='is_assigned')
    stageCount = serializers.SerializerMethodField()

    class Meta:
        model = Participant
        fields = [
            'id', 'firstName', 'lastName', 'email', 'gender', 'age',
            'nationality', 'language', 'languageIds', 'status', 'stageIds', 'stageCount',
            'assignedBungalowId', 'assignedBed', 'fullName', 'isAssigned',
            'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_stageIds(self, obj):
        """Retourne les IDs des stages auxquels le participant est inscrit (via ParticipantStage)."""
        return list(obj.stage_participations.values_list('stage_id', flat=True))

    def get_stageCount(self, obj):
        """Retourne le nombre d'événements auxquels le participant est inscrit."""
        return obj.stage_participations.count()

    def get_assignedBungalowId(self, obj):
        """Retourne l'ID du bungalow assigné ou None."""
        return obj.assigned_bungalow.id if obj.assigned_bungalow else None


class ParticipantCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de Participant avec inscription automatique aux stages."""

    firstName = serializers.CharField(source='first_name')
    lastName = serializers.CharField(source='last_name')
    # stageIds optionnel - permet de créer un participant et l'inscrire à des stages en une seule opération
    stageIds = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True
    )
    languageIds = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Language.objects.all(),
        source='languages',
        required=False,
        error_messages={
            'does_not_exist': '🌐 LANGUE INVALIDE: La langue sélectionnée (ID: {pk_value}) n\'existe pas ou a été supprimée.',
            'incorrect_type': '🌐 LANGUE INVALIDE: Le format de la langue est incorrect.',
        }
    )

    class Meta:
        model = Participant
        fields = [
            'firstName', 'lastName', 'email', 'gender', 'age',
            'nationality', 'language', 'languageIds', 'status', 'stageIds'
        ]

    def validate(self, data):
        """Validation des données de participant."""
        # Validation de l'âge
        age = data.get('age', 0)
        if age < 16:
            raise serializers.ValidationError({
                'age': f'L\'âge minimum est 16 ans. Âge saisi: {age} ans.'
            })
        if age > 80:
            raise serializers.ValidationError({
                'age': f'L\'âge maximum est 80 ans. Âge saisi: {age} ans.'
            })

        return data

    def create(self, validated_data):
        """Créer un participant et optionnellement l'inscrire à des stages."""
        stage_ids = validated_data.pop('stageIds', [])
        languages = validated_data.pop('languages', [])

        # Créer le participant
        participant = Participant.objects.create(**validated_data)

        # Assigner les langues
        if languages:
            participant.languages.set(languages)

        # Si des stages sont fournis, créer les inscriptions via ParticipantStage
        if stage_ids:
            for stage_id in stage_ids:
                try:
                    stage = Stage.objects.get(pk=stage_id)
                    # Vérifier la capacité
                    if stage.current_participants < stage.capacity:
                        ParticipantStage.objects.create(
                            participant=participant,
                            stage=stage,
                            created_by=self.context.get('request').user if self.context.get('request') else None
                        )
                        # Mettre à jour le compteur
                        stage.current_participants = stage.participant_registrations.count()
                        stage.save(update_fields=['current_participants'])
                except Stage.DoesNotExist:
                    pass

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
    languageIds = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Language.objects.all(),
        source='languages',
        required=False,
        error_messages={
            'does_not_exist': '🌐 LANGUE INVALIDE: La langue sélectionnée (ID: {pk_value}) n\'existe pas ou a été supprimée. Veuillez rafraîchir la page et sélectionner une langue dans la liste.',
            'incorrect_type': '🌐 LANGUE INVALIDE: Le format de la langue est incorrect.',
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
            'firstName', 'lastName', 'email', 'gender', 'age', 'nationality',
            'language', 'languageIds', 'status', 'stageIds', 'assignedBungalowId', 'assignedBed'
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
        # Extraire les relations ManyToMany si présentes
        stages = validated_data.pop('stages', None)
        languages = validated_data.pop('languages', None)

        # Mettre à jour les autres champs
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Mettre à jour les relations ManyToMany si fournies
        if stages is not None:
            instance.stages.set(stages)
        if languages is not None:
            instance.languages.set(languages)

        return instance


class ParticipantListSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour la liste des participants."""

    firstName = serializers.CharField(source='first_name')
    lastName = serializers.CharField(source='last_name')
    stageIds = serializers.PrimaryKeyRelatedField(many=True, read_only=True, source='stages')
    languageIds = serializers.PrimaryKeyRelatedField(many=True, read_only=True, source='languages')
    assignedBungalowId = serializers.SerializerMethodField()
    assignedBed = serializers.CharField(source='assigned_bed', allow_null=True, read_only=True)
    isAssigned = serializers.ReadOnlyField(source='is_assigned')

    class Meta:
        model = Participant
        fields = [
            'id', 'firstName', 'lastName', 'email', 'gender', 'age',
            'language', 'languageIds', 'status', 'stageIds',
            'assignedBungalowId', 'assignedBed', 'isAssigned'
        ]

    def get_assignedBungalowId(self, obj):
        """Retourne l'ID du bungalow assigné ou None."""
        return obj.assigned_bungalow.id if obj.assigned_bungalow else None


class StageListSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour la liste des stages."""

    startDate = serializers.DateField(source='start_date')
    endDate = serializers.DateField(source='end_date')
    eventType = serializers.CharField(source='event_type')
    instructor = serializers.CharField(required=False, allow_blank=True)
    instructor2 = serializers.CharField(required=False, allow_blank=True)
    instructor3 = serializers.CharField(required=False, allow_blank=True)
    currentParticipants = serializers.SerializerMethodField()
    musiciansCount = serializers.IntegerField(source='musicians_count')
    constraints = serializers.JSONField()
    status = serializers.ReadOnlyField()
    progressPercentage = serializers.ReadOnlyField(source='progress_percentage')

    def get_currentParticipants(self, obj):
        """Calcule le nombre réel de participants inscrits à cet événement."""
        return ParticipantStage.objects.filter(stage=obj).count()

    class Meta:
        model = Stage
        fields = [
            'id', 'name', 'startDate', 'endDate', 'eventType', 'instructor', 'instructor2', 'instructor3',
            'capacity', 'currentParticipants', 'musiciansCount', 'constraints',
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


class LanguageSerializer(serializers.ModelSerializer):
    """Serializer pour Language correspondant à l'interface TypeScript."""

    # Mapping des champs pour correspondre au frontend React
    nativeName = serializers.CharField(source='native_name', allow_blank=True)
    isActive = serializers.BooleanField(source='is_active')
    displayOrder = serializers.IntegerField(source='display_order')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    createdBy = serializers.PrimaryKeyRelatedField(source='created_by', read_only=True)

    # Champs calculés
    participantCount = serializers.ReadOnlyField(source='participant_count')

    class Meta:
        model = Language
        fields = [
            'id', 'code', 'name', 'nativeName', 'isActive', 'displayOrder',
            'participantCount', 'createdAt', 'updatedAt', 'createdBy'
        ]
        read_only_fields = ['id', 'createdAt', 'updatedAt', 'createdBy']


class LanguageCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de Language."""

    nativeName = serializers.CharField(source='native_name', allow_blank=True, required=False)
    isActive = serializers.BooleanField(source='is_active', default=True)
    displayOrder = serializers.IntegerField(source='display_order', default=0)

    class Meta:
        model = Language
        fields = ['code', 'name', 'nativeName', 'isActive', 'displayOrder']

    def validate_code(self, value):
        """Validation du code de la langue."""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError(
                '⚠️ ERREUR: Le code de la langue est obligatoire.'
            )

        # Vérifier l'unicité
        if Language.objects.filter(code__iexact=value).exists():
            raise serializers.ValidationError(
                f'ERREUR: Le code "{value}" existe déjà. Chaque langue doit avoir un code unique.'
            )

        return value.strip().lower()

    def validate_name(self, value):
        """Validation du nom de la langue."""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError(
                '⚠️ ERREUR: Le nom de la langue est obligatoire.'
            )

        # Vérifier l'unicité
        if Language.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError(
                f'ERREUR: La langue "{value}" existe déjà.'
            )

        return value.strip()

    def validate_displayOrder(self, value):
        """Validation de l'ordre d'affichage."""
        if value < 0:
            raise serializers.ValidationError(
                'ERREUR: L\'ordre d\'affichage doit être un nombre positif ou zéro.'
            )
        return value


class LanguageUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour la mise à jour de Language."""

    nativeName = serializers.CharField(source='native_name', allow_blank=True, required=False)
    isActive = serializers.BooleanField(source='is_active', required=False)
    displayOrder = serializers.IntegerField(source='display_order', required=False)

    class Meta:
        model = Language
        fields = ['code', 'name', 'nativeName', 'isActive', 'displayOrder']

    def validate_code(self, value):
        """Validation du code de la langue."""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError(
                '⚠️ ERREUR: Le code de la langue est obligatoire.'
            )

        # Vérifier l'unicité (exclure l'instance actuelle)
        existing = Language.objects.filter(code__iexact=value).exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError(
                f'ERREUR: Le code "{value}" existe déjà. Chaque langue doit avoir un code unique.'
            )

        return value.strip().lower()

    def validate_name(self, value):
        """Validation du nom de la langue."""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError(
                '⚠️ ERREUR: Le nom de la langue est obligatoire.'
            )

        # Vérifier l'unicité (exclure l'instance actuelle)
        existing = Language.objects.filter(name__iexact=value).exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError(
                f'ERREUR: La langue "{value}" existe déjà.'
            )

        return value.strip()

    def validate_displayOrder(self, value):
        """Validation de l'ordre d'affichage."""
        if value < 0:
            raise serializers.ValidationError(
                'ERREUR: L\'ordre d\'affichage doit être un nombre positif ou zéro.'
            )
        return value

    def validate_isActive(self, value):
        """Validation du statut actif."""
        # Empêcher la désactivation si des participants utilisent cette langue
        if not value and self.instance:
            participant_count = self.instance.participant_count
            if participant_count > 0:
                raise serializers.ValidationError(
                    f'🚫 IMPOSSIBLE DE DÉSACTIVER: Cette langue est utilisée par {participant_count} participant(s). '
                    f'Vous devez d\'abord modifier la langue de ces participants avant de pouvoir la désactiver.'
                )
        return value


class LanguageListSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour la liste des langues."""

    nativeName = serializers.CharField(source='native_name')
    isActive = serializers.BooleanField(source='is_active')
    displayOrder = serializers.IntegerField(source='display_order')
    participantCount = serializers.ReadOnlyField(source='participant_count')

    class Meta:
        model = Language
        fields = ['id', 'code', 'name', 'nativeName', 'isActive', 'displayOrder', 'participantCount']


# ==================== PARTICIPANT STAGE SERIALIZERS ====================

class ParticipantStageSerializer(serializers.ModelSerializer):
    """Serializer pour lire les inscriptions participant-stage."""

    # Informations du participant (en lecture)
    participantId = serializers.IntegerField(source='participant.id', read_only=True)
    participantName = serializers.CharField(source='participant.full_name', read_only=True)
    participantEmail = serializers.EmailField(source='participant.email', read_only=True)
    participantGender = serializers.CharField(source='participant.gender', read_only=True)
    participantAge = serializers.IntegerField(source='participant.age', read_only=True)
    participantNationality = serializers.CharField(source='participant.nationality', read_only=True)
    participantStatus = serializers.CharField(source='participant.status', read_only=True)
    participantLanguage = serializers.CharField(source='participant.language', read_only=True)

    # Informations du stage (en lecture)
    stageId = serializers.IntegerField(source='stage.id', read_only=True)
    stageName = serializers.CharField(source='stage.name', read_only=True)
    stageStartDate = serializers.DateField(source='stage.start_date', read_only=True)
    stageEndDate = serializers.DateField(source='stage.end_date', read_only=True)

    # Champs spécifiques à la participation avec mapping camelCase
    arrivalDate = serializers.DateField(source='arrival_date', required=False, allow_null=True)
    arrivalTime = serializers.TimeField(source='arrival_time', required=False, allow_null=True)
    departureDate = serializers.DateField(source='departure_date', required=False, allow_null=True)
    departureTime = serializers.TimeField(source='departure_time', required=False, allow_null=True)
    roleDisplay = serializers.CharField(source='get_role_display', read_only=True)

    # Informations d'assignation de l'inscription (sur ParticipantStage, pas Participant)
    assignedBungalowId = serializers.IntegerField(source='assigned_bungalow_id', read_only=True)
    assignedBungalowName = serializers.SerializerMethodField()
    assignedBed = serializers.CharField(source='assigned_bed', read_only=True)
    isAssigned = serializers.BooleanField(source='is_assigned', read_only=True)

    # Dates effectives (arrival/departure ou dates du stage)
    effectiveArrivalDate = serializers.DateField(source='effective_arrival_date', read_only=True)
    effectiveDepartureDate = serializers.DateField(source='effective_departure_date', read_only=True)

    class Meta:
        model = ParticipantStage
        fields = [
            'id', 'participantId', 'participantName', 'participantEmail',
            'participantGender', 'participantAge', 'participantNationality',
            'participantStatus', 'participantLanguage',
            'stageId', 'stageName', 'stageStartDate', 'stageEndDate',
            'arrivalDate', 'arrivalTime', 'departureDate', 'departureTime',
            'effectiveArrivalDate', 'effectiveDepartureDate',
            'role', 'roleDisplay', 'notes',
            'assignedBungalowId', 'assignedBungalowName', 'assignedBed', 'isAssigned',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_assignedBungalowName(self, obj):
        """Retourne le nom du bungalow assigné à cette inscription."""
        if obj.assigned_bungalow:
            return obj.assigned_bungalow.name
        return None


class ParticipantStageCreateSerializer(serializers.ModelSerializer):
    """Serializer pour créer une inscription participant-stage."""

    participantId = serializers.PrimaryKeyRelatedField(
        queryset=Participant.objects.all(),
        source='participant',
        error_messages={
            'does_not_exist': 'Le participant sélectionné (ID: {pk_value}) n\'existe pas.',
        }
    )
    stageId = serializers.PrimaryKeyRelatedField(
        queryset=Stage.objects.all(),
        source='stage',
        error_messages={
            'does_not_exist': 'L\'événement sélectionné (ID: {pk_value}) n\'existe pas.',
        }
    )
    arrivalDate = serializers.DateField(source='arrival_date', required=False, allow_null=True)
    arrivalTime = serializers.TimeField(source='arrival_time', required=False, allow_null=True)
    departureDate = serializers.DateField(source='departure_date', required=False, allow_null=True)
    departureTime = serializers.TimeField(source='departure_time', required=False, allow_null=True)

    class Meta:
        model = ParticipantStage
        fields = [
            'participantId', 'stageId',
            'arrivalDate', 'arrivalTime', 'departureDate', 'departureTime',
            'role', 'notes'
        ]

    def validate(self, data):
        """Validation de l'inscription."""
        participant = data.get('participant')
        stage = data.get('stage')

        # Vérifier si le participant n'est pas déjà inscrit à cet événement
        existing = ParticipantStage.objects.filter(
            participant=participant,
            stage=stage
        )
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)

        if existing.exists():
            raise serializers.ValidationError({
                'participantId': f'Le participant "{participant.full_name}" est déjà inscrit à l\'événement "{stage.name}".'
            })

        # Vérifier la capacité de l'événement
        if stage.current_participants >= stage.capacity:
            raise serializers.ValidationError({
                'stageId': f'L\'événement "{stage.name}" est complet ({stage.capacity} places).'
            })

        return data

    def create(self, validated_data):
        """Créer l'inscription et mettre à jour le compteur du stage."""
        participant_stage = ParticipantStage.objects.create(**validated_data)

        # Mettre à jour le compteur de participants du stage
        stage = validated_data['stage']
        stage.current_participants = stage.participant_registrations.count()
        stage.save(update_fields=['current_participants'])

        return participant_stage


class ParticipantStageUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour mettre à jour une inscription participant-stage."""

    arrivalDate = serializers.DateField(source='arrival_date', required=False, allow_null=True)
    arrivalTime = serializers.TimeField(source='arrival_time', required=False, allow_null=True)
    departureDate = serializers.DateField(source='departure_date', required=False, allow_null=True)
    departureTime = serializers.TimeField(source='departure_time', required=False, allow_null=True)

    class Meta:
        model = ParticipantStage
        fields = [
            'arrivalDate', 'arrivalTime', 'departureDate', 'departureTime',
            'role', 'notes'
        ]


class ParticipantSimpleSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour les participants (sans lien stage)."""

    firstName = serializers.CharField(source='first_name')
    lastName = serializers.CharField(source='last_name')
    fullName = serializers.ReadOnlyField(source='full_name')
    languageIds = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Language.objects.all(),
        source='languages',
        required=False
    )
    assignedBungalowId = serializers.IntegerField(source='assigned_bungalow_id', read_only=True)
    assignedBed = serializers.CharField(read_only=True)
    isAssigned = serializers.ReadOnlyField(source='is_assigned')

    # Nombre d'événements auxquels le participant est inscrit
    stageCount = serializers.SerializerMethodField()

    class Meta:
        model = Participant
        fields = [
            'id', 'firstName', 'lastName', 'fullName', 'email', 'gender', 'age',
            'nationality', 'language', 'languageIds', 'status',
            'assignedBungalowId', 'assignedBed', 'isAssigned',
            'stageCount', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_stageCount(self, obj):
        """Retourne le nombre d'événements auxquels le participant est inscrit."""
        return obj.stage_participations.count()


class ParticipantCreateSimpleSerializer(serializers.ModelSerializer):
    """Serializer pour créer un participant sans l'associer à un événement."""

    firstName = serializers.CharField(source='first_name')
    lastName = serializers.CharField(source='last_name')
    languageIds = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Language.objects.all(),
        source='languages',
        required=False
    )

    class Meta:
        model = Participant
        fields = [
            'firstName', 'lastName', 'email', 'gender', 'age',
            'nationality', 'language', 'languageIds', 'status'
        ]

    def validate_age(self, value):
        """Validation de l'âge."""
        if value < 16:
            raise serializers.ValidationError(
                f'L\'âge minimum est 16 ans. Âge saisi: {value} ans.'
            )
        if value > 80:
            raise serializers.ValidationError(
                f'L\'âge maximum est 80 ans. Âge saisi: {value} ans.'
            )
        return value

    def create(self, validated_data):
        """Créer un participant."""
        languages = validated_data.pop('languages', [])
        participant = Participant.objects.create(**validated_data)
        if languages:
            participant.languages.set(languages)
        return participant


class ActivityLogSerializer(serializers.ModelSerializer):
    """Serializer pour l'historique des activités."""

    actionType = serializers.CharField(source='action_type')
    modelName = serializers.CharField(source='model_name')
    objectId = serializers.IntegerField(source='object_id')
    objectRepr = serializers.CharField(source='object_repr')
    userName = serializers.SerializerMethodField()
    userEmail = serializers.SerializerMethodField()
    actionTypeDisplay = serializers.CharField(source='get_action_type_display', read_only=True)
    modelNameDisplay = serializers.CharField(source='get_model_name_display', read_only=True)

    class Meta:
        model = ActivityLog
        fields = [
            'id', 'user', 'userName', 'userEmail', 'actionType', 'actionTypeDisplay',
            'modelName', 'modelNameDisplay', 'objectId', 'objectRepr',
            'description', 'changes', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']

    def get_userName(self, obj):
        """Retourne le nom complet de l'utilisateur."""
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        return "Système"

    def get_userEmail(self, obj):
        """Retourne l'email de l'utilisateur."""
        return obj.user.email if obj.user else None

