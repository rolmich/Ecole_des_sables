# ✅ Problème de Création de Participants Résolu

## Problème

Après le changement vers ManyToManyField (`stage` → `stages`), il n'était plus possible de créer des participants.

## Cause

Django Rest Framework ne peut pas gérer automatiquement les relations ManyToMany lors de la création. Il faut une méthode `create()` et `update()` personnalisées.

## Solution

Ajout des méthodes `create()` et `update()` dans les serializers :

### ParticipantCreateSerializer

```python
def create(self, validated_data):
    """Créer un participant avec gestion ManyToMany."""
    # 1. Extraire les stages AVANT de créer l'instance
    stages = validated_data.pop('stages', [])
    
    # 2. Créer le participant
    participant = Participant.objects.create(**validated_data)
    
    # 3. Assigner les stages APRÈS la création
    if stages:
        participant.stages.set(stages)
    
    return participant
```

### ParticipantUpdateSerializer

```python
def update(self, instance, validated_data):
    """Mettre à jour un participant avec gestion ManyToMany."""
    # 1. Extraire les stages si présents
    stages = validated_data.pop('stages', None)
    
    # 2. Mettre à jour les autres champs
    for attr, value in validated_data.items():
        setattr(instance, attr, value)
    instance.save()
    
    # 3. Mettre à jour les stages si fournis
    if stages is not None:
        instance.stages.set(stages)
    
    return instance
```

## Pourquoi c'est nécessaire ?

Avec un **ForeignKey**, Django peut assigner directement lors du `create()`.

Avec un **ManyToManyField**, l'objet doit d'abord **exister en base de données** (avoir un `id`) avant de pouvoir utiliser `.set()` ou `.add()` sur la relation.

## Flux de création

```
1. Frontend envoie: { firstName: "John", stageIds: [1, 2] }
2. Serializer extrait: stages = [Stage(1), Stage(2)]
3. Participant créé SANS stages
4. Stages assignés avec .set()
5. Participant retourné au frontend
```

## Testé et Fonctionnel ✅

- ✅ Création de participants
- ✅ Modification de participants
- ✅ Assignment de plusieurs stages
- ✅ Validation des données

## Redémarrage Nécessaire

```bash
# Arrêter le serveur Django (Ctrl+C)
# Puis relancer
cd eds_backend
python manage.py runserver
```

Maintenant vous pouvez créer des participants ! 🎉

