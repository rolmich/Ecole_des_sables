from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User


class UserModelTest(TestCase):
    """Tests pour le modèle User."""
    
    def setUp(self):
        """Configuration initiale pour chaque test."""
        self.user_data = {
            'email': 'test@example.com',
            'username': 'testuser',
            'password': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User',
            'role': 'staff',
            'status': 'active'
        }
    
    def test_create_user(self):
        """Test de création d'un utilisateur normal."""
        user = User.objects.create_user(**self.user_data)
        
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.first_name, 'Test')
        self.assertEqual(user.last_name, 'User')
        self.assertEqual(user.role, 'staff')
        self.assertEqual(user.status, 'active')
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.check_password('testpass123'))
    
    def test_create_superuser(self):
        """Test de création d'un superutilisateur."""
        admin = User.objects.create_superuser(
            email='admin@example.com',
            username='admin',
            password='admin123',
            first_name='Admin',
            last_name='User'
        )
        
        self.assertEqual(admin.email, 'admin@example.com')
        self.assertEqual(admin.role, 'admin')
        self.assertEqual(admin.status, 'active')
        self.assertTrue(admin.is_active)
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
    
    def test_user_str_method(self):
        """Test de la méthode __str__ du modèle User."""
        user = User.objects.create_user(**self.user_data)
        self.assertEqual(str(user), 'Test User (test@example.com)')
    
    def test_get_full_name(self):
        """Test de la méthode get_full_name."""
        user = User.objects.create_user(**self.user_data)
        self.assertEqual(user.get_full_name(), 'Test User')
    
    def test_get_short_name(self):
        """Test de la méthode get_short_name."""
        user = User.objects.create_user(**self.user_data)
        self.assertEqual(user.get_short_name(), 'Test')
    
    def test_unique_email_constraint(self):
        """Test que l'email doit être unique."""
        User.objects.create_user(**self.user_data)
        
        with self.assertRaises(Exception):
            User.objects.create_user(**self.user_data)
    
    def test_unique_username_constraint(self):
        """Test que le username doit être unique."""
        User.objects.create_user(**self.user_data)
        
        user_data_2 = self.user_data.copy()
        user_data_2['email'] = 'test2@example.com'
        
        with self.assertRaises(Exception):
            User.objects.create_user(**user_data_2)


class AuthenticationAPITest(APITestCase):
    """Tests pour les endpoints d'authentification."""
    
    def setUp(self):
        """Configuration initiale pour chaque test."""
        self.client = APIClient()
        self.register_url = reverse('register')
        self.login_url = reverse('login')
        self.logout_url = reverse('logout')
        self.current_user_url = reverse('current_user')
        
        # Créer un utilisateur de test
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='staff',
            status='active'
        )
    
    def test_register_user(self):
        """Test d'inscription d'un nouvel utilisateur."""
        data = {
            'firstName': 'New',
            'lastName': 'User',
            'email': 'newuser@example.com',
            'username': 'newuser',
            'password': 'newpass123',
            'password2': 'newpass123'
        }
        
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertIn('tokens', response.data)
        self.assertEqual(response.data['user']['email'], 'newuser@example.com')
        self.assertEqual(response.data['user']['firstName'], 'New')
        self.assertEqual(response.data['user']['lastName'], 'User')
        self.assertEqual(response.data['user']['role'], 'staff')
        self.assertEqual(response.data['user']['status'], 'pending')
    
    def test_register_with_mismatched_passwords(self):
        """Test d'inscription avec des mots de passe non correspondants."""
        data = {
            'firstName': 'New',
            'lastName': 'User',
            'email': 'newuser@example.com',
            'username': 'newuser',
            'password': 'newpass123',
            'password2': 'differentpass123'
        }
        
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_register_with_existing_email(self):
        """Test d'inscription avec un email déjà existant."""
        data = {
            'firstName': 'New',
            'lastName': 'User',
            'email': 'test@example.com',  # Email déjà utilisé
            'username': 'newuser',
            'password': 'newpass123',
            'password2': 'newpass123'
        }
        
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_login_with_valid_credentials(self):
        """Test de connexion avec des identifiants valides."""
        data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('user', response.data)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])
        self.assertEqual(response.data['user']['email'], 'test@example.com')
    
    def test_login_with_invalid_credentials(self):
        """Test de connexion avec des identifiants invalides."""
        data = {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        }
        
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_login_with_nonexistent_email(self):
        """Test de connexion avec un email inexistant."""
        data = {
            'email': 'nonexistent@example.com',
            'password': 'testpass123'
        }
        
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_get_current_user_authenticated(self):
        """Test de récupération de l'utilisateur actuel (authentifié)."""
        # Générer un token pour l'utilisateur
        refresh = RefreshToken.for_user(self.user)
        access_token = str(refresh.access_token)
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get(self.current_user_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'test@example.com')
        self.assertEqual(response.data['firstName'], 'Test')
        self.assertEqual(response.data['lastName'], 'User')
    
    def test_get_current_user_unauthenticated(self):
        """Test de récupération de l'utilisateur actuel (non authentifié)."""
        response = self.client.get(self.current_user_url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_logout(self):
        """Test de déconnexion."""
        # Générer un token pour l'utilisateur
        refresh = RefreshToken.for_user(self.user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        data = {'refresh': refresh_token}
        
        response = self.client.post(self.logout_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)


class UserCRUDAPITest(APITestCase):
    """Tests pour les endpoints CRUD des utilisateurs."""
    
    def setUp(self):
        """Configuration initiale pour chaque test."""
        self.client = APIClient()
        
        # Créer un admin
        self.admin = User.objects.create_user(
            email='admin@example.com',
            username='admin',
            password='admin123',
            first_name='Admin',
            last_name='User',
            role='admin',
            status='active'
        )
        self.admin.is_staff = True
        self.admin.is_superuser = True
        self.admin.save()
        
        # Créer un utilisateur normal
        self.user = User.objects.create_user(
            email='user@example.com',
            username='user',
            password='user123',
            first_name='Normal',
            last_name='User',
            role='staff',
            status='active'
        )
        
        # Générer un token pour l'admin
        refresh = RefreshToken.for_user(self.admin)
        self.admin_token = str(refresh.access_token)
        
        # URLs
        self.user_list_url = reverse('user_list')
        self.user_create_url = reverse('user_create')
    
    def test_list_users_authenticated(self):
        """Test de récupération de la liste des utilisateurs (authentifié)."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        response = self.client.get(self.user_list_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertGreaterEqual(len(response.data['results']), 2)
    
    def test_list_users_unauthenticated(self):
        """Test de récupération de la liste des utilisateurs (non authentifié)."""
        response = self.client.get(self.user_list_url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_users_with_role_filter(self):
        """Test de filtrage par rôle."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        response = self.client.get(f'{self.user_list_url}?role=admin')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for user in response.data['results']:
            self.assertEqual(user['role'], 'admin')
    
    def test_list_users_with_status_filter(self):
        """Test de filtrage par statut."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        response = self.client.get(f'{self.user_list_url}?status=active')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for user in response.data['results']:
            self.assertEqual(user['status'], 'active')
    
    def test_create_user(self):
        """Test de création d'un utilisateur."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        data = {
            'firstName': 'New',
            'lastName': 'Staff',
            'email': 'newstaff@example.com',
            'username': 'newstaff',
            'password': 'newpass123',
            'phone': '+221 77 123 45 67',
            'role': 'staff',
            'department': 'IT',
            'permissions': ['view_stages'],
            'status': 'active'
        }
        
        response = self.client.post(self.user_create_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['email'], 'newstaff@example.com')
        self.assertEqual(response.data['firstName'], 'New')
        self.assertEqual(response.data['role'], 'staff')
        self.assertEqual(response.data['createdBy'], 'Admin User')
    
    def test_get_user_detail(self):
        """Test de récupération du détail d'un utilisateur."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        url = reverse('user_detail', kwargs={'pk': self.user.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'user@example.com')
        self.assertEqual(response.data['firstName'], 'Normal')
    
    def test_update_user(self):
        """Test de modification d'un utilisateur."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        url = reverse('user_update', kwargs={'pk': self.user.id})
        data = {
            'phone': '+221 77 999 88 77',
            'department': 'Finance',
            'role': 'manager'
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['phone'], '+221 77 999 88 77')
        self.assertEqual(response.data['department'], 'Finance')
        self.assertEqual(response.data['role'], 'manager')
    
    def test_delete_user(self):
        """Test de suppression d'un utilisateur."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        url = reverse('user_delete', kwargs={'pk': self.user.id})
        
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
        
        # Vérifier que l'utilisateur a été supprimé
        with self.assertRaises(User.DoesNotExist):
            User.objects.get(id=self.user.id)
    
    def test_delete_own_account_forbidden(self):
        """Test qu'un utilisateur ne peut pas supprimer son propre compte."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        url = reverse('user_delete', kwargs={'pk': self.admin.id})
        
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)


class SerializerTest(TestCase):
    """Tests pour les serializers."""
    
    def setUp(self):
        """Configuration initiale pour chaque test."""
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123',
            first_name='Test',
            last_name='User',
            phone='+221 77 123 45 67',
            role='staff',
            department='IT',
            status='active'
        )
        self.user.custom_permissions = ['view_stages', 'edit_stages']
        self.user.save()
    
    def test_user_serializer_fields(self):
        """Test que le UserSerializer retourne les bons champs en camelCase."""
        from .serializers import UserSerializer
        
        serializer = UserSerializer(self.user)
        data = serializer.data
        
        # Vérifier les champs en camelCase
        self.assertIn('firstName', data)
        self.assertIn('lastName', data)
        self.assertIn('createdAt', data)
        self.assertIn('createdBy', data)
        self.assertIn('lastLogin', data)
        self.assertIn('permissions', data)
        
        # Vérifier les valeurs
        self.assertEqual(data['firstName'], 'Test')
        self.assertEqual(data['lastName'], 'User')
        self.assertEqual(data['email'], 'test@example.com')
        self.assertEqual(data['phone'], '+221 77 123 45 67')
        self.assertEqual(data['role'], 'staff')
        self.assertEqual(data['department'], 'IT')
        self.assertEqual(data['status'], 'active')
        self.assertEqual(data['permissions'], ['view_stages', 'edit_stages'])


class PermissionsTest(APITestCase):
    """Tests pour les permissions et l'accès aux endpoints."""
    
    def setUp(self):
        """Configuration initiale pour chaque test."""
        self.client = APIClient()
        
        # Créer différents types d'utilisateurs
        self.admin = User.objects.create_user(
            email='admin@example.com',
            username='admin',
            password='admin123',
            first_name='Admin',
            last_name='User',
            role='admin',
            status='active'
        )
        
        self.manager = User.objects.create_user(
            email='manager@example.com',
            username='manager',
            password='manager123',
            first_name='Manager',
            last_name='User',
            role='manager',
            status='active'
        )
        
        self.staff = User.objects.create_user(
            email='staff@example.com',
            username='staff',
            password='staff123',
            first_name='Staff',
            last_name='User',
            role='staff',
            status='active'
        )
        
        # Générer des tokens
        self.admin_token = str(RefreshToken.for_user(self.admin).access_token)
        self.staff_token = str(RefreshToken.for_user(self.staff).access_token)
    
    def test_staff_can_view_users(self):
        """Test qu'un staff peut voir la liste des utilisateurs."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.staff_token}')
        response = self.client.get(reverse('user_list'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_staff_can_update_own_profile(self):
        """Test qu'un staff peut modifier son propre profil."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.staff_token}')
        url = reverse('user_update', kwargs={'pk': self.staff.id})
        data = {'phone': '+221 77 888 77 66'}
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_only_admin_can_delete_users(self):
        """Test que seul un admin peut supprimer un utilisateur."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.staff_token}')
        url = reverse('user_delete', kwargs={'pk': self.manager.id})
        
        response = self.client.delete(url)
        
        # Staff ne devrait pas pouvoir supprimer
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
