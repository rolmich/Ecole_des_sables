# École des Sables - Système de Gestion des Logements (React)

## Description

Application React moderne pour la gestion des logements de l'École des Sables. Cette application permet de gérer les participants, les stages, les villages, les assignations de bungalows et les utilisateurs du système.

## Fonctionnalités

### 🔐 Authentification
- Page de connexion sécurisée
- Gestion des sessions utilisateur
- Protection des routes

### 👥 Gestion des Utilisateurs
- Création, modification et suppression d'utilisateurs
- Gestion des rôles (Admin, Manager, Staff)
- Système de permissions
- Filtrage et recherche avancée

### 📊 Tableau de Bord
- Statistiques en temps réel
- Activités récentes
- Actions rapides

### 🎭 Gestion des Stages
- Création et gestion des stages
- Suivi des participants
- Gestion des contraintes

### 👥 Gestion des Participants
- Inscription des participants
- Gestion des informations personnelles
- Assignation aux stages

### 🏘️ Gestion des Villages
- Visualisation des villages A, B, C
- Gestion des bungalows
- Suivi de l'occupation

### 🏠 Assignations
- Assignation des participants aux bungalows
- Gestion des lits (simple/double)
- Optimisation des assignations

### 📈 Rapports
- Génération de rapports
- Statistiques détaillées
- Export des données

## Technologies Utilisées

- **React 18** - Framework JavaScript
- **TypeScript** - Typage statique
- **React Router** - Navigation
- **CSS3** - Styling moderne
- **HTML5** - Structure sémantique

## Installation

1. **Cloner le projet**
   ```bash
   git clone [url-du-repo]
   cd ecole-des-sables-react
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Lancer l'application**
   ```bash
   npm start
   ```

4. **Ouvrir dans le navigateur**
   ```
   http://localhost:3000
   ```

## Utilisation

### Connexion
- Utilisez les identifiants : `admin` / `admin`
- Ou créez de nouveaux utilisateurs via la section "Utilisateurs"

### Navigation
- **Tableau de bord** : Vue d'ensemble du système
- **Stages** : Gestion des stages de danse
- **Participants** : Gestion des participants
- **Villages** : Visualisation des villages et bungalows
- **Assignations** : Assignation des participants aux bungalows
- **Rapports** : Génération de rapports et statistiques
- **Utilisateurs** : Gestion des utilisateurs du système

## Structure du Projet

```
src/
├── components/          # Composants React
│   ├── Login.tsx       # Page de connexion
│   ├── Layout.tsx      # Layout principal avec sidebar
│   ├── Dashboard.tsx   # Tableau de bord
│   ├── Users.tsx       # Gestion des utilisateurs
│   ├── Stages.tsx      # Gestion des stages
│   ├── Participants.tsx # Gestion des participants
│   ├── Villages.tsx    # Gestion des villages
│   ├── Assignments.tsx # Gestion des assignations
│   └── Reports.tsx     # Génération de rapports
├── services/           # Services
│   ├── authService.ts  # Service d'authentification
│   └── dataService.ts  # Service de données
├── types/              # Types TypeScript
│   ├── User.ts         # Interface utilisateur
│   ├── Participant.ts  # Interface participant
│   ├── Stage.ts        # Interface stage
│   └── Bungalow.ts     # Interface bungalow
└── App.tsx             # Composant principal
```

## Scripts Disponibles

- `npm start` - Lance l'application en mode développement
- `npm build` - Construit l'application pour la production
- `npm test` - Lance les tests
- `npm eject` - Éjecte la configuration (irréversible)

## Développement

### Ajout de Nouvelles Fonctionnalités
1. Créer le composant dans `src/components/`
2. Ajouter les styles CSS correspondants
3. Mettre à jour les routes dans `App.tsx`
4. Ajouter les types TypeScript si nécessaire

### Gestion des Données
- Les données sont actuellement stockées en mémoire
- Pour une application de production, connectez-vous à une API
- Modifiez les services dans `src/services/`

## Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -am 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Créer une Pull Request

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## Support

Pour toute question ou problème, contactez l'équipe de développement.

---

**École des Sables** - Système de Gestion des Logements
Développé avec ❤️ en React + TypeScript




