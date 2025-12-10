# Règles de Validation des Assignations

Ce document décrit toutes les règles de validation appliquées lors de l'assignation manuelle ou automatique des participants aux bungalows.

## Vue d'Ensemble

Les règles de validation garantissent que:
1. Les encadrants sont seuls dans leur chambre
2. Les musiciens sont groupés dans le Village C
3. Les étudiants sont séparés des encadrants et musiciens
4. Hommes et femmes sont séparés
5. Pas de double occupation des lits
6. Pas de dépassement de capacité

## Règles Appliquées

### 1. Validation de Genre ✅

**Règle**: Hommes et femmes ne peuvent pas partager le même bungalow pendant des périodes qui se chevauchent.

**Vérification**:
- Compare le genre du participant avec tous les occupants actuels du bungalow
- Vérifie les chevauchements de dates entre les périodes de séjour
- Bloque l'assignation si un conflit est détecté

**Message d'erreur**:
```
Conflit de genre: [Nom Occupant] (Homme/Femme) occupe ce bungalow du [date début] au [date fin].
Impossible d'ajouter [Nom Participant] (Homme/Femme).
```

### 2. Validation d'Occupation des Lits ✅

**Règle**: Un lit ne peut être occupé que par une seule personne à la fois.

**Vérification**:
- Vérifie si le lit spécifié est déjà occupé
- Compare les périodes de séjour (arrival_date → departure_date)
- Détecte les chevauchements de dates

**Message d'erreur**:
```
Le lit [bed_id] est déjà occupé par [Nom] du [date début] au [date fin]
```

### 3. Encadrants Doivent Être Seuls ✅

**Règle**: Les participants avec le rôle "instructor" (encadrant) doivent être seuls dans leur bungalow.

**Vérification Bidirectionnelle**:

**a) Lors de l'assignation d'un encadrant:**
- Vérifie qu'aucun autre participant n'est déjà assigné au même bungalow pendant la période
- Empêche l'assignation si quelqu'un d'autre est présent

**Message d'erreur**:
```
Règle encadrants: Les encadrants doivent être seuls dans leur chambre.
[Nom Occupant] occupe déjà ce bungalow du [date début] au [date fin].
```

**b) Lors de l'assignation avec un encadrant présent:**
- Vérifie si un encadrant occupe déjà le bungalow pendant la période
- Empêche l'assignation de toute autre personne

**Message d'erreur**:
```
Règle encadrants: Impossible d'assigner à ce bungalow.
L'encadrant [Nom] doit être seul et occupe ce bungalow du [date début] au [date fin].
```

### 4. Musiciens dans Village C ✅

**Règle**: Les participants avec le rôle "musician" (musicien) doivent être assignés uniquement au Village C.

**Vérification**:
- Compare le village du bungalow avec le rôle du participant
- Bloque l'assignation si un musicien est assigné à un bungalow des Villages A ou B

**Message d'erreur**:
```
Règle musiciens: Les musiciens doivent être assignés au Village C.
Le bungalow [nom] est dans le Village [A/B].
```

**Justification**: Les musiciens ont besoin d'être regroupés pour faciliter la collaboration et minimiser les nuisances sonores.

### 5. Séparation des Rôles ✅

**Règle**: Les étudiants (role='participant') ne peuvent pas partager un bungalow avec des musiciens ou encadrants.

**Vérification Bidirectionnelle**:

**a) Lors de l'assignation d'un étudiant:**
- Vérifie qu'aucun musicien ou encadrant n'occupe le bungalow pendant la période
- Empêche le mélange de rôles

**Message d'erreur**:
```
Règle séparation: Les étudiants ne peuvent pas partager un bungalow avec des musiciens ou encadrants.
[Nom] (musicien/encadrant) occupe ce bungalow du [date début] au [date fin].
```

**b) Lors de l'assignation d'un musicien/staff:**
- Vérifie qu'aucun étudiant n'occupe le bungalow pendant la période
- Empêche le mélange inverse

**Message d'erreur**:
```
Règle séparation: Les musiciens/staff ne peuvent pas partager un bungalow avec des étudiants.
[Nom] (étudiant) occupe ce bungalow du [std_start] au [std_end].
```

## Chevauchement de Dates

### Logique de Détection

Deux périodes se chevauchent si:
```
start_date <= other_end_date AND end_date >= other_start_date
```

### Exemples

**Cas 1: Chevauchement Total**
```
Personne A: 01/12 → 10/12
Personne B: 03/12 → 07/12
Résultat: ❌ CHEVAUCHEMENT (B est entièrement dans A)
```

**Cas 2: Chevauchement Partiel**
```
Personne A: 01/12 → 10/12
Personne B: 05/12 → 15/12
Résultat: ❌ CHEVAUCHEMENT (05/12 → 10/12)
```

**Cas 3: Pas de Chevauchement**
```
Personne A: 01/12 → 05/12
Personne B: 06/12 → 10/12
Résultat: ✅ OK (B arrive après le départ de A)
```

**Cas 4: Dates Adjacentes**
```
Personne A: 01/12 → 05/12 (départ)
Personne B: 05/12 → 10/12 (arrivée)
Résultat: ❌ CHEVAUCHEMENT (même date = présence simultanée)
```

## Application des Règles

### Assignation Automatique

Lors de l'assignation automatique (`auto_assign_stage_participants`), le système:
1. Applique toutes ces règles lors de la sélection du bungalow
2. Priorise les bungalows qui respectent les règles
3. Refuse l'assignation si aucun bungalow valide n'est disponible

### Assignation Manuelle

Lors de l'assignation manuelle (`assign_registration`), le système:
1. Vérifie toutes les règles avant l'assignation
2. Retourne une erreur HTTP 400 avec un message explicatif si une règle est violée
3. Ne permet l'assignation que si toutes les validations passent

## Ordre de Validation

Les validations sont effectuées dans cet ordre:

1. **Existence des ressources**: Vérifier que l'inscription, le bungalow et le lit existent
2. **Validation de genre**: Pas de mixité homme-femme
3. **Occupation du lit**: Le lit spécifique n'est pas déjà occupé
4. **Règle encadrants seuls**: Si encadrant, doit être seul
5. **Règle pas avec encadrants**: Si quelqu'un d'autre, pas avec un encadrant
6. **Règle Village C pour musiciens**: Musiciens uniquement au Village C
7. **Règle séparation des rôles**: Étudiants séparés des musiciens/encadrants

## Cas Spéciaux

### Staff

Le rôle "staff" suit les mêmes règles que les musiciens pour la séparation:
- Ne peuvent pas partager avec des étudiants
- Peuvent partager avec d'autres staff ou musiciens (selon le genre)

### Dates Personnalisées

Les participants peuvent avoir des dates d'arrivée/départ différentes de l'événement:
- `arrival_date` et `departure_date` dans `ParticipantStage`
- Si null, utilise les dates de l'événement (`stage.start_date` / `stage.end_date`)
- La validation utilise toujours les dates effectives (`effective_arrival_date` / `effective_departure_date`)

### Événements Multiples Simultanés

Lorsque plusieurs événements se chevauchent:
- Les règles s'appliquent à tous les participants présents, peu importe leur événement
- Un encadrant de l'Événement A ne peut pas partager avec un participant de l'Événement B
- La séparation des rôles est globale, pas par événement

## Tests

### Script de Test

Utilisez `test_overlap_simple.py` pour vérifier l'intégrité du système:

```bash
cd eds_backend
python test_overlap_simple.py
```

### Ce Qui Est Testé

- ✅ Chevauchements de dates sur le même lit
- ✅ Sureffectifs (plus d'assignations que de lits)
- ✅ Sureffectifs temporels (plus de personnes présentes qu'il n'y a de lits à un moment donné)

### Résultat Attendu

```
[OK] SYSTÈME SAIN - Aucun problème détecté!
```

## Amélioration Continue

Pour ajouter de nouvelles règles:

1. **Ajouter la validation dans `assign_registration()`** (ligne ~1260)
2. **Ajouter la même logique dans l'assignation automatique** (si applicable)
3. **Documenter ici** avec exemples et messages d'erreur
4. **Créer des tests** dans `test_assignment_system.py`
5. **Mettre à jour `README_TESTS.md`**

## Support

En cas de problème avec les validations:
1. Vérifier les logs d'erreur dans Django
2. Exécuter `test_overlap_simple.py` pour détecter les problèmes
3. Consulter ce document pour comprendre les règles
4. Consulter le code source dans `views.py` (fonction `assign_registration`, lignes 1178-1373)

---

**Dernière mise à jour**: 03 Décembre 2025
**Version**: 1.0
