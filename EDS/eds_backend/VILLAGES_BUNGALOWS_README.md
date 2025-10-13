# Système de Gestion des Villages et Bungalows

## Vue d'ensemble

Ce système permet de gérer les villages et bungalows de l'École des Sables via un fichier de configuration JSON. Inspiré du système LinkedCorp pour les job titles et skills, il synchronise automatiquement la base de données avec le fichier de configuration.

## Concept

### Caractéristiques principales

1. **Configuration centralisée** : Tous les villages et bungalows sont définis dans `villages_bungalows.json`
2. **Synchronisation automatique** : Le script `populate_villages.py` synchronise la base de données avec le fichier
3. **Lecture seule via l'application** : Les villages et bungalows ne peuvent pas être créés/modifiés via l'interface web
4. **Protection des données** : Les bungalows occupés ne peuvent pas être supprimés

### Types de Villages

- **Village A** : Douches/Toilettes Communes
- **Village B** : Douches/Toilettes Communes  
- **Village C** : Salle de douche + WC privés

### Types de Bungalows

- **Type A** : 3 lits simples (capacité: 3 personnes)
- **Type B** : 1 lit simple + 1 lit double (capacité: 2 personnes)

## Structure du fichier de configuration

### Format JSON

```json
{
  "villages": {
    "A": {
      "amenities_type": "shared",
      "bungalows": {
        "A1": {"type": "A"},
        "A2": {"type": "A"},
        "A3": {"type": "B"}
      }
    },
    "B": {
      "amenities_type": "shared",
      "bungalows": {
        "B1": {"type": "A"},
        "B2": {"type": "B"}
      }
    },
    "C": {
      "amenities_type": "private",
      "bungalows": {
        "C1": {"type": "A"}
      }
    }
  }
}
```

### Champs

#### Village
- `amenities_type` : Type d'équipements
  - `"shared"` : Douches/Toilettes Communes
  - `"private"` : Salle de douche + WC privés

#### Bungalow
- `type` : Type de bungalow
  - `"A"` : 3 lits simples
  - `"B"` : 1 lit simple + 1 lit double

## Utilisation

### 1. Modifier la configuration

Éditez le fichier `villages_bungalows.json` :

```bash
nano villages_bungalows.json
```

### 2. Synchroniser avec la base de données

Exécutez le script de population :

```bash
python populate_villages.py
```

### 3. Vérifier les résultats

Le script affiche un rapport détaillé :

```
🏝️  Démarrage de la synchronisation des villages et bungalows...
✅ Village A créé
  ✅ Bungalow A-A1 (Type A) créé
  ✅ Bungalow A-A2 (Type A) créé
  ✅ Bungalow A-A3 (Type B) créé
...
📊 Résumé de la synchronisation:
Villages:
  • Créés: 3
  • Mis à jour: 0
  • Supprimés: 0
Bungalows:
  • Créés: 24
  • Mis à jour: 0
  • Supprimés: 0
✅ Synchronisation terminée avec succès!
```

## Exemples de scénarios

### Scénario 1 : Ajouter un nouveau bungalow

**Avant** (`villages_bungalows.json`) :
```json
{
  "villages": {
    "A": {
      "amenities_type": "shared",
      "bungalows": {
        "A1": {"type": "A"},
        "A2": {"type": "A"}
      }
    }
  }
}
```

**Après** :
```json
{
  "villages": {
    "A": {
      "amenities_type": "shared",
      "bungalows": {
        "A1": {"type": "A"},
        "A2": {"type": "A"},
        "A3": {"type": "B"}  ← Nouveau
      }
    }
  }
}
```

**Résultat** : Le bungalow A3 sera créé automatiquement lors de la prochaine synchronisation.

### Scénario 2 : Supprimer un bungalow

**Avant** :
```json
{
  "villages": {
    "A": {
      "amenities_type": "shared",
      "bungalows": {
        "A1": {"type": "A"},
        "A2": {"type": "A"},
        "A3": {"type": "B"}
      }
    }
  }
}
```

**Après** :
```json
{
  "villages": {
    "A": {
      "amenities_type": "shared",
      "bungalows": {
        "A1": {"type": "A"},
        "A2": {"type": "A"}
        ← A3 supprimé
      }
    }
  }
}
```

**Résultat** :
- Si A3 est **vide** : Il sera supprimé
- Si A3 est **occupé** : Un avertissement sera affiché et il ne sera PAS supprimé

```
⚠️  Bungalow A-A3 est occupé, suppression annulée
```

### Scénario 3 : Modifier le type d'un bungalow

**Avant** :
```json
"A1": {"type": "A"}  ← 3 lits simples
```

**Après** :
```json
"A1": {"type": "B"}  ← 1 lit simple + 1 lit double
```

**Résultat** :
- Si le bungalow est **vide** : Le type sera modifié
- Si le bungalow est **occupé** : Un avertissement sera affiché et il ne sera PAS modifié

```
⚠️  Bungalow A-A1 est occupé, type non modifié
```

### Scénario 4 : Ajouter un nouveau village

**Avant** :
```json
{
  "villages": {
    "A": {...},
    "B": {...}
  }
}
```

**Après** :
```json
{
  "villages": {
    "A": {...},
    "B": {...},
    "D": {
      "amenities_type": "private",
      "bungalows": {
        "D1": {"type": "A"}
      }
    }
  }
}
```

**Résultat** : Le village D et son bungalow D1 seront créés automatiquement.

## Protection des données

### Bungalows occupés

Un bungalow est considéré comme **occupé** si au moins un participant y est assigné (`occupancy > 0`).

**Actions protégées** :
- ❌ Suppression du bungalow
- ❌ Changement du type (A → B ou B → A)

**Actions autorisées** :
- ✅ Modification des équipements (amenities)

### Villages occupés

Un village est considéré comme **occupé** si au moins un de ses bungalows est occupé.

**Actions protégées** :
- ❌ Suppression du village

## API REST

### Endpoints Villages

```
GET    /api/villages/              # Liste tous les villages
GET    /api/villages/{id}/         # Détails d'un village
GET    /api/villages/statistics/   # Statistiques des villages
GET    /api/villages/{name}/bungalows/  # Bungalows d'un village
```

### Endpoints Bungalows

```
GET    /api/bungalows/             # Liste tous les bungalows
GET    /api/bungalows/{id}/        # Détails d'un bungalow
GET    /api/bungalows/available/   # Bungalows avec lits disponibles
GET    /api/bungalows/{id}/details/  # Détails avec participants
```

### Exemples de réponses

#### GET /api/villages/

```json
[
  {
    "id": 1,
    "name": "A",
    "amenitiesType": "shared",
    "totalBungalows": 8,
    "occupiedBungalows": 5
  }
]
```

#### GET /api/bungalows/

```json
[
  {
    "id": 1,
    "name": "A1",
    "village": "A",
    "type": "A",
    "capacity": 3,
    "occupancy": 2,
    "beds": [
      {"id": "bed1", "type": "single", "occupiedBy": 5},
      {"id": "bed2", "type": "single", "occupiedBy": 7},
      {"id": "bed3", "type": "single", "occupiedBy": null}
    ],
    "amenities": ["shared_bathroom"],
    "isFull": false,
    "isEmpty": false,
    "availableBeds": 1
  }
]
```

## Modèles de données

### Village

```python
class Village(models.Model):
    name = models.CharField(max_length=1, choices=[('A', 'Village A'), ('B', 'Village B'), ('C', 'Village C')])
    amenities_type = models.CharField(max_length=10, choices=[('shared', 'Douches/Toilettes Communes'), ('private', 'Salle de douche + WC privés')])
```

### Bungalow

```python
class Bungalow(models.Model):
    village = models.ForeignKey(Village, on_delete=models.CASCADE)
    name = models.CharField(max_length=50)
    type = models.CharField(max_length=1, choices=[('A', 'Type A - 3 lits simples'), ('B', 'Type B - 1 lit simple + 1 lit double')])
    capacity = models.PositiveIntegerField()
    occupancy = models.PositiveIntegerField(default=0)
    beds = models.JSONField(default=list)
    amenities = models.JSONField(default=list)
```

## Dépannage

### Erreur : "Bungalow occupé, suppression annulée"

**Cause** : Vous essayez de supprimer un bungalow qui a des participants assignés.

**Solution** :
1. Réassignez les participants à d'autres bungalows
2. Relancez la synchronisation

### Erreur : "Fichier de configuration non trouvé"

**Cause** : Le fichier `villages_bungalows.json` n'existe pas ou n'est pas au bon endroit.

**Solution** :
```bash
# Vérifiez que le fichier existe dans eds_backend/
ls eds_backend/villages_bungalows.json

# Si absent, créez-le
cp villages_bungalows.json.example villages_bungalows.json
```

### Erreur : "Erreur de parsing JSON"

**Cause** : Le fichier JSON contient des erreurs de syntaxe.

**Solution** :
```bash
# Validez votre JSON avec
python -m json.tool villages_bungalows.json
```

## Intégration avec le frontend

Le frontend React utilise les types TypeScript suivants :

```typescript
export interface Bungalow {
  id: number;
  name: string;
  village: 'A' | 'B' | 'C';
  type: 'A' | 'B';
  capacity: number;
  occupancy: number;
  beds: { id: string; type: 'single' | 'double'; occupiedBy: number | null }[];
  amenities: string[];
}
```

Les serializers Django sont configurés pour retourner les données dans ce format exact.

## Commandes utiles

```bash
# Synchroniser la configuration
python populate_villages.py

# Créer les migrations (première fois uniquement)
python manage.py makemigrations participants

# Appliquer les migrations
python manage.py migrate

# Lancer les tests
python manage.py test participants.tests.VillagesBungalowsTests

# Vérifier la configuration actuelle
python manage.py shell
>>> from participants.models import Village, Bungalow
>>> Village.objects.all()
>>> Bungalow.objects.all()
```

## Workflow recommandé

1. **Modifier** le fichier `villages_bungalows.json`
2. **Valider** la syntaxe JSON
3. **Synchroniser** avec `python populate_villages.py`
4. **Vérifier** les changements dans l'admin Django ou via l'API
5. **Tester** dans le frontend React

## Notes importantes

- Les villages et bungalows **ne peuvent être créés/modifiés QUE via le fichier de configuration**
- L'interface web est en **lecture seule** pour ces entités
- Les participants peuvent être assignés/désassignés normalement
- La configuration est versionnée avec Git pour un suivi des changements

