from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
import json

from .models import Stage, Participant, Village, Bungalow

User = get_user_model()


class StageModelTest(TestCase):
    """Tests pour le modèle Stage."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        self.stage = Stage.objects.create(
            name='Stage Test',
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=7),
            instructor='Instructeur Test',
            capacity=10,
            created_by=self.user
        )
    
    def test_stage_creation(self):
        """Test de création d'un stage."""
        self.assertEqual(self.stage.name, 'Stage Test')
        self.assertEqual(self.stage.capacity, 10)
        self.assertEqual(self.stage.current_participants, 0)
        self.assertEqual(self.stage.created_by, self.user)
    
    def test_stage_status_active(self):
        """Test du statut actif d'un stage."""
        self.assertTrue(self.stage.is_active)
        self.assertFalse(self.stage.is_upcoming)
        self.assertFalse(self.stage.is_completed)
        self.assertEqual(self.stage.status, 'active')
    
    def test_stage_status_upcoming(self):
        """Test du statut à venir d'un stage."""
        future_stage = Stage.objects.create(
            name='Stage Futur',
            start_date=timezone.now().date() + timezone.timedelta(days=10),
            end_date=timezone.now().date() + timezone.timedelta(days=17),
            instructor='Instructeur Futur',
            capacity=5,
            created_by=self.user
        )
        
        self.assertFalse(future_stage.is_active)
        self.assertTrue(future_stage.is_upcoming)
        self.assertFalse(future_stage.is_completed)
        self.assertEqual(future_stage.status, 'upcoming')
    
    def test_stage_status_completed(self):
        """Test du statut terminé d'un stage."""
        past_stage = Stage.objects.create(
            name='Stage Passé',
            start_date=timezone.now().date() - timezone.timedelta(days=10),
            end_date=timezone.now().date() - timezone.timedelta(days=3),
            instructor='Instructeur Passé',
            capacity=5,
            created_by=self.user
        )
        
        self.assertFalse(past_stage.is_active)
        self.assertFalse(past_stage.is_upcoming)
        self.assertTrue(past_stage.is_completed)
        self.assertEqual(past_stage.status, 'completed')
    
    def test_progress_percentage(self):
        """Test du calcul du pourcentage de progression."""
        # Stage vide
        self.assertEqual(self.stage.progress_percentage, 0)
        
        # Stage avec participants
        self.stage.current_participants = 5
        self.stage.save()
        self.assertEqual(self.stage.progress_percentage, 50)


class ParticipantModelTest(TestCase):
    """Tests pour le modèle Participant."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        self.stage = Stage.objects.create(
            name='Stage Test',
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=7),
            instructor='Instructeur Test',
            capacity=10,
            created_by=self.user
        )
        
        self.participant = Participant.objects.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            gender='M',
            age=25,
            language='Français',
            status='student',
            created_by=self.user
        )
        self.participant.stages.add(self.stage)
    
    def test_participant_creation(self):
        """Test de création d'un participant."""
        self.assertEqual(self.participant.first_name, 'John')
        self.assertEqual(self.participant.last_name, 'Doe')
        self.assertEqual(self.participant.email, 'john@example.com')
        self.assertEqual(self.participant.gender, 'M')
        self.assertEqual(self.participant.age, 25)
        self.assertEqual(self.participant.status, 'student')
        self.assertIn(self.stage, self.participant.stages.all())
        self.assertFalse(self.participant.is_assigned)
    
    def test_full_name_property(self):
        """Test de la propriété full_name."""
        self.assertEqual(self.participant.full_name, 'John Doe')
    
    def test_is_assigned_property(self):
        """Test de la propriété is_assigned."""
        self.assertFalse(self.participant.is_assigned)
        
        # Créer un village et bungalow
        village = Village.objects.create(name='A', amenities_type='shared')
        bungalow = Bungalow.objects.create(
            village=village,
            name='A1',
            type='A',
            capacity=3,
            beds=[],
            amenities=[]
        )
        
        self.participant.assigned_bungalow = bungalow
        self.participant.save()
        self.assertTrue(self.participant.is_assigned)
    
    def test_participant_multiple_stages(self):
        """Test qu'un participant peut avoir plusieurs stages."""
        stage2 = Stage.objects.create(
            name='Stage Test 2',
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=7),
            instructor='Instructeur Test 2',
            capacity=10,
            created_by=self.user
        )
        
        # Ajouter un deuxième stage
        self.participant.stages.add(stage2)
        
        # Vérifier qu'il a bien deux stages
        self.assertEqual(self.participant.stages.count(), 2)
        self.assertIn(self.stage, self.participant.stages.all())
        self.assertIn(stage2, self.participant.stages.all())


class ParticipantAPITest(APITestCase):
    """Tests pour l'API des participants."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        
        # Obtenir un token JWT
        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        self.stage = Stage.objects.create(
            name='Stage Test',
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=7),
            instructor='Instructeur Test',
            capacity=10,
            created_by=self.user
        )
        
        self.participant_data = {
            'firstName': 'John',
            'lastName': 'Doe',
            'email': 'john@example.com',
            'gender': 'M',
            'age': 25,
            'language': 'Français',
            'status': 'student',
            'stageIds': [self.stage.id]
        }
    
    def test_create_participant(self):
        """Test de création d'un participant via API."""
        url = reverse('participants:participant-list-create')
        response = self.client.post(url, self.participant_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Participant.objects.count(), 1)
        
        participant = Participant.objects.first()
        self.assertEqual(participant.first_name, self.participant_data['firstName'])
        self.assertEqual(participant.last_name, self.participant_data['lastName'])
        self.assertEqual(participant.email, self.participant_data['email'])
        self.assertIn(self.stage, participant.stages.all())
        self.assertEqual(participant.created_by, self.user)
    
    def test_create_participant_multiple_stages(self):
        """Test de création d'un participant avec plusieurs stages."""
        stage2 = Stage.objects.create(
            name='Stage Test 2',
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=7),
            instructor='Instructeur Test 2',
            capacity=10,
            created_by=self.user
        )
        
        data = self.participant_data.copy()
        data['stageIds'] = [self.stage.id, stage2.id]
        data['email'] = 'multi@example.com'
        
        url = reverse('participants:participant-list-create')
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        participant = Participant.objects.get(email='multi@example.com')
        self.assertEqual(participant.stages.count(), 2)
        self.assertIn(self.stage, participant.stages.all())
        self.assertIn(stage2, participant.stages.all())
    
    def test_list_participants(self):
        """Test de liste des participants via API."""
        # Créer quelques participants supplémentaires
        participant1 = Participant.objects.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            gender='M',
            age=25,
            language='Français',
            status='student',
            created_by=self.user
        )
        participant1.stages.add(self.stage)
        
        participant2 = Participant.objects.create(
            first_name='Jane',
            last_name='Smith',
            email='jane@example.com',
            gender='F',
            age=30,
            language='Anglais',
            status='instructor',
            created_by=self.user
        )
        participant2.stages.add(self.stage)
        
        url = reverse('participants:participant-list-create')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Vérifier que les participants créés sont dans la réponse
        self.assertIn('results', response.data)
        participant_names = [p['firstName'] + ' ' + p['lastName'] for p in response.data['results']]
        self.assertIn('John Doe', participant_names)
        self.assertIn('Jane Smith', participant_names)
    
    def test_retrieve_participant(self):
        """Test de récupération d'un participant via API."""
        participant = Participant.objects.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            gender='M',
            age=25,
            language='Français',
            status='student',
            created_by=self.user
        )
        participant.stages.add(self.stage)
        
        url = reverse('participants:participant-detail', kwargs={'pk': participant.pk})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['firstName'], participant.first_name)
        self.assertEqual(response.data['lastName'], participant.last_name)
        self.assertEqual(response.data['email'], participant.email)
    
    def test_update_participant(self):
        """Test de mise à jour d'un participant via API."""
        participant = Participant.objects.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            gender='M',
            age=25,
            language='Français',
            status='student',
            created_by=self.user
        )
        participant.stages.add(self.stage)
        
        update_data = {
            'firstName': 'Johnny',
            'age': 26,
            'status': 'instructor'
        }
        
        url = reverse('participants:participant-detail', kwargs={'pk': participant.pk})
        response = self.client.patch(url, update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        participant.refresh_from_db()
        self.assertEqual(participant.first_name, 'Johnny')
        self.assertEqual(participant.age, 26)
        self.assertEqual(participant.status, 'instructor')
    
    def test_delete_participant(self):
        """Test de suppression d'un participant via API."""
        participant = Participant.objects.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            gender='M',
            age=25,
            language='Français',
            status='student',
            created_by=self.user
        )
        participant.stages.add(self.stage)
        
        url = reverse('participants:participant-detail', kwargs={'pk': participant.pk})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Participant.objects.count(), 0)
    
    def test_assign_participant(self):
        """Test d'assignation d'un participant."""
        # Créer un village et bungalow
        village = Village.objects.create(name='A', amenities_type='shared')
        bungalow = Bungalow.objects.create(
            village=village,
            name='A1',
            type='A',
            capacity=3,
            beds=[],
            amenities=[]
        )
        
        participant = Participant.objects.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            gender='M',
            age=25,
            language='Français',
            status='student',
            created_by=self.user
        )
        participant.stages.add(self.stage)
        
        assign_data = {
            'bungalowId': bungalow.id,
            'bed': 'bed1'
        }
        
        url = reverse('participants:assign-participant', kwargs={'participant_id': participant.pk})
        response = self.client.post(url, assign_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        participant.refresh_from_db()
        self.assertEqual(participant.assigned_bungalow, bungalow)
        self.assertEqual(participant.assigned_bed, 'bed1')
        self.assertTrue(participant.is_assigned)
    
    def test_unassign_participant(self):
        """Test de désassignation d'un participant."""
        # Créer un village et bungalow
        village = Village.objects.create(name='A', amenities_type='shared')
        bungalow = Bungalow.objects.create(
            village=village,
            name='A1',
            type='A',
            capacity=3,
            beds=[],
            amenities=[]
        )
        
        participant = Participant.objects.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            gender='M',
            age=25,
            language='Français',
            status='student',
            assigned_bungalow=bungalow,
            assigned_bed='bed1',
            created_by=self.user
        )
        participant.stages.add(self.stage)
        
        url = reverse('participants:unassign-participant', kwargs={'participant_id': participant.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        participant.refresh_from_db()
        self.assertIsNone(participant.assigned_bungalow)
        self.assertIsNone(participant.assigned_bed)
        self.assertFalse(participant.is_assigned)
    
    def test_participants_by_stage(self):
        """Test de récupération des participants par stage."""
        # Créer des participants pour le stage
        p1 = Participant.objects.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            gender='M',
            age=25,
            language='Français',
            status='student',
            created_by=self.user
        )
        p1.stages.add(self.stage)
        
        p2 = Participant.objects.create(
            first_name='Jane',
            last_name='Smith',
            email='jane@example.com',
            gender='F',
            age=30,
            language='Anglais',
            status='instructor',
            created_by=self.user
        )
        p2.stages.add(self.stage)
        
        url = reverse('participants:participants-by-stage', kwargs={'stage_id': self.stage.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['participants']), 2)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(response.data['stage']['name'], self.stage.name)
    
    def test_unassigned_participants(self):
        """Test de récupération des participants non assignés."""
        # Créer un village et bungalow
        village = Village.objects.create(name='A', amenities_type='shared')
        bungalow = Bungalow.objects.create(
            village=village,
            name='A1',
            type='A',
            capacity=3,
            beds=[],
            amenities=[]
        )
        
        # Participant non assigné
        p1 = Participant.objects.create(
            first_name='John',
            last_name='Doe',
            email='john@example.com',
            gender='M',
            age=25,
            language='Français',
            status='student',
            created_by=self.user
        )
        p1.stages.add(self.stage)
        
        # Participant assigné
        p2 = Participant.objects.create(
            first_name='Jane',
            last_name='Smith',
            email='jane@example.com',
            gender='F',
            age=30,
            language='Anglais',
            status='instructor',
            assigned_bungalow=bungalow,
            assigned_bed='bed1',
            created_by=self.user
        )
        p2.stages.add(self.stage)
        
        url = reverse('participants:unassigned-participants')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['participants']), 1)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['participants'][0]['firstName'], 'John')
