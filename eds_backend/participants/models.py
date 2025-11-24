from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Village(models.Model):
    """Modèle Village - géré uniquement par le fichier de configuration."""
    
    VILLAGE_CHOICES = [
        ('A', 'Village A'),
        ('B', 'Village B'),
        ('C', 'Village C'),
    ]
    
    AMENITIES_CHOICES = [
        ('shared', 'Douches/Toilettes Communes'),
        ('private', 'Salle de douche + WC privés'),
    ]
    
    name = models.CharField(max_length=1, choices=VILLAGE_CHOICES, unique=True, verbose_name="Nom du village")
    amenities_type = models.CharField(max_length=10, choices=AMENITIES_CHOICES, verbose_name="Type d'équipements")
    
    class Meta:
        verbose_name = "Village"
        verbose_name_plural = "Villages"
        ordering = ['name']
    
    def __str__(self):
        return f"Village {self.name}"
    
    @property
    def total_bungalows(self):
        """Nombre total de bungalows dans le village."""
        return self.bungalows.count()
    
    @property
    def occupied_bungalows(self):
        """Nombre de bungalows occupés (au moins un lit occupé)."""
        return self.bungalows.filter(occupancy__gt=0).count()


class Bungalow(models.Model):
    """Modèle Bungalow - géré uniquement par le fichier de configuration."""
    
    TYPE_CHOICES = [
        ('A', 'Type A - 3 lits simples'),
        ('B', 'Type B - 1 lit simple + 1 lit double'),
    ]
    
    village = models.ForeignKey(
        Village,
        on_delete=models.CASCADE,
        related_name='bungalows',
        verbose_name="Village"
    )
    name = models.CharField(max_length=50, verbose_name="Nom du bungalow")
    type = models.CharField(max_length=1, choices=TYPE_CHOICES, verbose_name="Type de bungalow")
    capacity = models.PositiveIntegerField(verbose_name="Capacité totale")
    occupancy = models.PositiveIntegerField(default=0, verbose_name="Occupation actuelle")
    beds = models.JSONField(default=list, verbose_name="Configuration des lits")
    amenities = models.JSONField(default=list, blank=True, verbose_name="Équipements")
    
    class Meta:
        verbose_name = "Bungalow"
        verbose_name_plural = "Bungalows"
        ordering = ['village__name', 'name']
        unique_together = ['village', 'name']
    
    def __str__(self):
        return f"{self.village.name} - {self.name}"
    
    @property
    def is_full(self):
        """Vérifie si le bungalow est complet."""
        return self.occupancy >= self.capacity
    
    @property
    def is_empty(self):
        """Vérifie si le bungalow est vide."""
        return self.occupancy == 0
    
    @property
    def available_beds(self):
        """Retourne le nombre de lits disponibles."""
        return self.capacity - self.occupancy
    
    def update_occupancy(self):
        """Met à jour l'occupation en comptant les lits occupés."""
        occupied_count = sum(1 for bed in self.beds if bed.get('occupiedBy') is not None)
        self.occupancy = occupied_count
        self.save(update_fields=['occupancy'])


class Stage(models.Model):
    """Modèle Stage correspondant à l'interface TypeScript."""

    EVENT_TYPE_CHOICES = [
        ('stage', 'Stage'),
        ('resident', 'Résident'),
        ('autres', 'Autres'),
    ]

    name = models.CharField(max_length=200, verbose_name="Nom du stage")
    start_date = models.DateField(verbose_name="Date de début")
    end_date = models.DateField(verbose_name="Date de fin")
    event_type = models.CharField(
        max_length=20,
        choices=EVENT_TYPE_CHOICES,
        default='stage',
        verbose_name="Type d'événement"
    )
    instructor = models.CharField(max_length=100, blank=True, verbose_name="Encadrant principal")
    instructor2 = models.CharField(max_length=100, blank=True, verbose_name="Encadrant 2")
    instructor3 = models.CharField(max_length=100, blank=True, verbose_name="Encadrant 3")
    capacity = models.PositiveIntegerField(verbose_name="Capacité maximale")
    current_participants = models.PositiveIntegerField(default=0, verbose_name="Participants actuels")
    musicians_count = models.PositiveIntegerField(default=0, verbose_name="Nombre de musiciens")
    constraints = models.JSONField(default=list, blank=True, verbose_name="Contraintes spéciales")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Date de modification")
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        verbose_name="Créé par"
    )
    
    class Meta:
        verbose_name = "Stage"
        verbose_name_plural = "Stages"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.start_date} - {self.end_date})"
    
    @property
    def is_active(self):
        """Vérifie si le stage est actuellement actif."""
        from django.utils import timezone
        today = timezone.now().date()
        return self.start_date <= today <= self.end_date
    
    @property
    def is_upcoming(self):
        """Vérifie si le stage est à venir."""
        from django.utils import timezone
        today = timezone.now().date()
        return today < self.start_date
    
    @property
    def is_completed(self):
        """Vérifie si le stage est terminé."""
        from django.utils import timezone
        today = timezone.now().date()
        return today > self.end_date
    
    @property
    def status(self):
        """Retourne le statut du stage."""
        if self.is_upcoming:
            return 'upcoming'
        elif self.is_active:
            return 'active'
        else:
            return 'completed'
    
    @property
    def progress_percentage(self):
        """Calcule le pourcentage de progression du stage."""
        if self.capacity == 0:
            return 0
        return round((self.current_participants / self.capacity) * 100)
    
    @property
    def assigned_participants_count(self):
        """Nombre de participants assignés à des bungalows pour ce stage."""
        return self.participants.filter(assigned_bungalow__isnull=False).count()
    
    @property
    def assigned_bungalows_count(self):
        """Nombre de bungalows utilisés par les participants de ce stage."""
        return self.participants.filter(
            assigned_bungalow__isnull=False
        ).values('assigned_bungalow').distinct().count()


class Participant(models.Model):
    """Modèle Participant - données de base d'une personne (indépendant des événements)."""

    GENDER_CHOICES = [
        ('M', 'Homme'),
        ('F', 'Femme'),
    ]

    STATUS_CHOICES = [
        ('student', 'Élève'),
        ('instructor', 'Enseignant-e'),
        ('professional', 'Professionnel-le'),
        ('staff', 'Salarié-e'),
    ]

    first_name = models.CharField(max_length=100, verbose_name="Prénom")
    last_name = models.CharField(max_length=100, verbose_name="Nom")
    email = models.EmailField(unique=True, verbose_name="Email")
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, verbose_name="Sexe")
    age = models.PositiveIntegerField(verbose_name="Âge")
    nationality = models.CharField(max_length=100, blank=True, verbose_name="Nationalité")
    language = models.CharField(max_length=50, default="Français", verbose_name="Langue principale")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, verbose_name="Statut")

    # Relation avec les langues (ManyToMany pour permettre plusieurs langues)
    languages = models.ManyToManyField(
        'Language',
        related_name='participants',
        verbose_name="Langues parlées",
        blank=True
    )
    
    # Assignation à un bungalow
    assigned_bungalow = models.ForeignKey(
        'Bungalow',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_participants',
        verbose_name="Bungalow assigné"
    )
    assigned_bed = models.CharField(
        max_length=50, 
        null=True, 
        blank=True, 
        verbose_name="Lit assigné"
    )
    
    # Dates d'assignation au bungalow (basées sur le stage)
    assignment_start_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Date début assignation"
    )
    assignment_end_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Date fin assignation"
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Date de modification")
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        verbose_name="Créé par"
    )
    
    class Meta:
        verbose_name = "Participant"
        verbose_name_plural = "Participants"
        ordering = ['last_name', 'first_name']
        constraints = [
            models.UniqueConstraint(
                fields=['first_name', 'last_name'],
                name='unique_participant_name'
            ),
        ]
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.get_status_display()})"
    
    @property
    def full_name(self):
        """Retourne le nom complet du participant."""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def is_assigned(self):
        """Vérifie si le participant est assigné à un bungalow."""
        return self.assigned_bungalow is not None


class Language(models.Model):
    """Modèle Language pour la gestion des langues disponibles."""

    code = models.CharField(
        max_length=10,
        unique=True,
        verbose_name="Code de la langue",
        help_text="Code ISO de la langue (ex: fr, en, es)"
    )
    name = models.CharField(
        max_length=100,
        verbose_name="Nom de la langue",
        help_text="Nom complet de la langue (ex: Français, English)"
    )
    native_name = models.CharField(
        max_length=100,
        verbose_name="Nom natif",
        help_text="Nom de la langue dans sa langue native",
        blank=True
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Active",
        help_text="Indique si la langue est disponible pour sélection"
    )
    display_order = models.PositiveIntegerField(
        default=0,
        verbose_name="Ordre d'affichage",
        help_text="Ordre d'affichage dans les listes (plus petit = plus haut)"
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Date de modification")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_languages',
        verbose_name="Créé par"
    )

    class Meta:
        verbose_name = "Langue"
        verbose_name_plural = "Langues"
        ordering = ['display_order', 'name']

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def participant_count(self):
        """Nombre de participants utilisant cette langue."""
        return self.participants.count()


class ParticipantStage(models.Model):
    """
    Modèle de liaison entre Participant et Stage.
    Permet d'inscrire un participant à plusieurs événements avec des informations spécifiques
    à chaque participation (dates d'arrivée/départ, rôle, etc.)
    """

    ROLE_CHOICES = [
        ('participant', 'Participant'),
        ('musician', 'Musicien'),
        ('instructor', 'Encadrant'),
        ('staff', 'Staff'),
    ]

    participant = models.ForeignKey(
        Participant,
        on_delete=models.CASCADE,
        related_name='stage_participations',
        verbose_name="Participant"
    )
    stage = models.ForeignKey(
        Stage,
        on_delete=models.CASCADE,
        related_name='participant_registrations',
        verbose_name="Événement"
    )

    # Dates et heures d'arrivée/départ spécifiques à cette participation
    arrival_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Date d'arrivée"
    )
    arrival_time = models.TimeField(
        null=True,
        blank=True,
        verbose_name="Heure d'arrivée"
    )
    departure_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Date de départ"
    )
    departure_time = models.TimeField(
        null=True,
        blank=True,
        verbose_name="Heure de départ"
    )

    # Rôle dans l'événement
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='participant',
        verbose_name="Rôle"
    )

    # Notes spécifiques à cette participation
    notes = models.TextField(
        blank=True,
        verbose_name="Notes",
        help_text="Notes spécifiques à cette participation"
    )

    # Assignation à un bungalow pour cette participation
    assigned_bungalow = models.ForeignKey(
        'Bungalow',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='participant_stage_assignments',
        verbose_name="Bungalow assigné"
    )
    assigned_bed = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        verbose_name="Lit assigné"
    )

    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date d'inscription")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Date de modification")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_participant_stages',
        verbose_name="Inscrit par"
    )

    class Meta:
        verbose_name = "Inscription participant"
        verbose_name_plural = "Inscriptions participants"
        ordering = ['-created_at']
        unique_together = ['participant', 'stage']  # Un participant ne peut être inscrit qu'une fois à un événement
        indexes = [
            models.Index(fields=['stage', 'participant']),
            models.Index(fields=['arrival_date']),
            models.Index(fields=['departure_date']),
        ]

    def __str__(self):
        return f"{self.participant.full_name} → {self.stage.name}"

    @property
    def is_musician(self):
        """Vérifie si le participant est musicien pour cet événement."""
        return self.role == 'musician'

    @property
    def is_instructor(self):
        """Vérifie si le participant est encadrant pour cet événement."""
        return self.role == 'instructor'

    @property
    def is_assigned(self):
        """Vérifie si cette inscription a une assignation de bungalow."""
        return self.assigned_bungalow is not None

    @property
    def effective_arrival_date(self):
        """Retourne la date d'arrivée effective (celle du participant ou celle du stage)."""
        return self.arrival_date or self.stage.start_date

    @property
    def effective_departure_date(self):
        """Retourne la date de départ effective (celle du participant ou celle du stage)."""
        return self.departure_date or self.stage.end_date


class ActivityLog(models.Model):
    """Modèle pour tracer toutes les actions des utilisateurs."""

    ACTION_TYPE_CHOICES = [
        ('create', 'Création'),
        ('update', 'Modification'),
        ('delete', 'Suppression'),
        ('assign', 'Assignation'),
        ('unassign', 'Désassignation'),
    ]

    MODEL_NAME_CHOICES = [
        ('Stage', 'Événement'),
        ('Participant', 'Participant'),
        ('Bungalow', 'Bungalow'),
        ('Village', 'Village'),
        ('Language', 'Langue'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='activity_logs',
        verbose_name="Utilisateur"
    )
    action_type = models.CharField(
        max_length=20,
        choices=ACTION_TYPE_CHOICES,
        verbose_name="Type d'action"
    )
    model_name = models.CharField(
        max_length=50,
        choices=MODEL_NAME_CHOICES,
        verbose_name="Modèle concerné"
    )
    object_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="ID de l'objet"
    )
    object_repr = models.CharField(
        max_length=200,
        verbose_name="Représentation de l'objet"
    )
    description = models.TextField(
        verbose_name="Description de l'action"
    )
    changes = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Détails des changements",
        help_text="Stocke les valeurs avant/après pour les modifications"
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date et heure"
    )

    class Meta:
        verbose_name = "Historique d'activité"
        verbose_name_plural = "Historique des activités"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['model_name', '-timestamp']),
        ]

    def __str__(self):
        user_name = self.user.username if self.user else "Système"
        return f"{user_name} - {self.get_action_type_display()} - {self.object_repr} - {self.timestamp.strftime('%Y-%m-%d %H:%M')}"

