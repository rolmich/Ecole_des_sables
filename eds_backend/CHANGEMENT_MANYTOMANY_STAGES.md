# Changement ManyToMany pour les Stages

## ⚠️ CHANGEMENT MAJEUR

Le modèle `Participant` a été modifié pour permettre à un participant d'être inscrit à **plusieurs stages** en même temps.

## Avant (ForeignKey)

```python
class Participant(models.Model):
    stage = models.ForeignKey(Stage, ...)  # UN seul stage
```

- ❌ Un participant ne pouvait appartenir qu'à UN seul stage
- ❌ Impossible d'inscrire quelqu'un à plusieurs formations simultanées

## Après (ManyToManyField)

```python
class Participant(models.Model):
    stages = models.ManyToManyField(Stage, ...)  # PLUSIEURS stages
```

- ✅ Un participant peut être inscrit à PLUSIEURS stages
- ✅ Plus flexible pour les formations chevauchantes

## Migrations Appliquées

```bash
python manage.py migrate
# ✅ 0003_change_stage_to_manytomany appliquée
```

## ⚠️ IMPORTANT: Mises à jour nécessaires

### 1. Backend

#### Serializers (À FAIRE)
- [ ] Mettre à jour `ParticipantSerializer` 
- [ ] Mettre à jour `ParticipantCreateSerializer`
- [ ] Changer `stageId` → `stageIds` (array)

#### Vues (À FAIRE)
- [ ] Adapter les filtres par stage
- [ ] Mettre à jour les statistiques
- [ ] Gérer les queries avec stages (ManyToMany)

### 2. Frontend

#### Types TypeScript (À FAIRE)
```typescript
// Avant
export interface Participant {
  stageId: number;  // UN seul stage
}

// Après
export interface Participant {
  stageIds: number[];  // PLUSIEURS stages
}
```

#### Composants (À FAIRE)
- [ ] `Participants.tsx` - Gérer array de stages
- [ ] `Stages.tsx` - Afficher participants multi-stages
- [ ] Formulaires - Permettre sélection multiple

## Migration des Données

⚠️ **Attention**: Les participants existants ont perdu leur assignation de stage lors de la migration.

Pour ré-assigner:
```python
# Via Django shell
python manage.py shell

from participants.models import Participant, Stage

# Exemple: Assigner un participant à plusieurs stages
participant = Participant.objects.get(id=1)
stage1 = Stage.objects.get(id=1)
stage2 = Stage.objects.get(id=2)

participant.stages.add(stage1, stage2)
participant.save()
```

## Status

- ✅ Migration créée
- ✅ Migration appliquée  
- ✅ Admin Django mis à jour
- ⏳ Serializers - EN COURS
- ⏳ Vues API - EN COURS
- ⏳ Frontend - EN COURS

