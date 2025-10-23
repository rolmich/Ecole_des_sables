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
    
    name = models.CharField(max_length=200, verbose_name="Nom du stage")
    start_date = models.DateField(verbose_name="Date de début")
    end_date = models.DateField(verbose_name="Date de fin")
    instructor = models.CharField(max_length=100, verbose_name="Encadrant principal")
    capacity = models.PositiveIntegerField(verbose_name="Capacité maximale")
    current_participants = models.PositiveIntegerField(default=0, verbose_name="Participants actuels")
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
    """Modèle Participant correspondant à l'interface TypeScript."""
    
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
    email = models.EmailField(verbose_name="Email")  # Pas unique globalement
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, verbose_name="Sexe")
    age = models.PositiveIntegerField(verbose_name="Âge")
    language = models.CharField(max_length=50, default="Français", verbose_name="Langue")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, verbose_name="Statut")
    
    # Relation avec les stages (ManyToMany pour permettre plusieurs stages)
    stages = models.ManyToManyField(
        Stage, 
        related_name='participants',
        verbose_name="Stages",
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

