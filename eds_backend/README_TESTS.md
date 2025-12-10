# Scripts de Test - Système d'Assignation

Ce document décrit les scripts de test disponibles pour vérifier le système d'assignation des bungalows.

## Scripts Disponibles

### 1. `test_overlap_simple.py` ✅ FONCTIONNEL

**Objectif**: Vérifier les assignations actuelles dans la base de données.

**Ce qu'il teste**:
- ✅ Chevauchements de dates (plusieurs personnes sur le même lit pendant la même période)
- ✅ Sureffectifs totaux (plus d'assignations que de lits disponibles)
- ✅ Sureffectifs temporels (plus de personnes présentes qu'il n'y a de lits à un moment donné)

**Utilisation**:
```bash
python test_overlap_simple.py
```

**Résultat**:
- Affiche tous les bungalows avec leurs assignations
- Détecte et signale les problèmes de chevauchement
- Calcule l'occupation maximale par période

### 2. `test_assignment_system.py` ⚠️ EN DÉVELOPPEMENT

**Objectif**: Tester le système complet avec des données de test.

**Ce qu'il devrait tester**:
- Création d'événements avec chevauchements de dates
- Création de participants (encadrants, musiciens, étudiants)
- Assignation automatique
- Vérification des règles d'assignation
- Gestion des dates personnalisées (arrivée/départ)

**Status**: Nécessite des corrections pour fonctionner avec le nouveau modèle ParticipantStage.

## Résultats des Tests

### Test du 03/12/2025 - État Actuel

**Script exécuté**: `test_overlap_simple.py`

**Résultat**: ✅ SYSTÈME SAIN

```
[OK] SYSTÈME SAIN - Aucun problème détecté!
```

**Détails**:
- 24 bungalows vérifiés (Villages A, B, C)
- 0 chevauchement de dates
- 0 sureffectif détecté
- Capacité totale: 67 lits

### Points de Vigilance Identifiés

#### 1. Chevauchements de Dates
**Risque**: Deux participants assignés au même lit avec des périodes qui se chevauchent.

**Exemple de problème potentiel**:
- Participant A: 01/12 → 10/12 (lit C1-bed1)
- Participant B: 05/12 → 15/12 (lit C1-bed1)
- **Problème**: Les deux sont présents du 05 au 10 décembre

**Protection actuelle**:
- ✅ Le système vérifie les chevauchements avant l'assignation
- ✅ La fonction `validate_assignment()` empêche les assignations conflictuelles
- ✅ Le filtre par dates dans l'UI masque les occupants non présents pendant la période affichée

#### 2. Sureffectif dans une Chambre
**Risque**: Plus de participants assignés qu'il n'y a de lits.

**Exemple de problème potentiel**:
- Bungalow A2: capacité 3 lits
- 4 participants assignés en même temps
- **Problème**: Impossible physiquement

**Protection actuelle**:
- ✅ Vérification de la capacité avant l'assignation
- ✅ Comptage des lits occupés pendant la période
- ✅ Refus de l'assignation si le bungalow est complet

#### 3. Non-Respect des Règles
**Règles implémentées**:
1. **Encadrants seuls** ✅
   - Doivent être seuls dans leur chambre
   - Priorité aux chambres avec WC privé

2. **Musiciens ensemble dans Village C** ✅
   - Groupés par affinité
   - Chambres avec douche intégrée

3. **Étudiants ensemble** ✅
   - Séparés des encadrants et musiciens
   - Villages A ou B

4. **Pas de mixité** ✅
   - Hommes et femmes séparés
   - Vérification du genre avant l'assignation

5. **Optimisation des lits** ✅
   - Utilisation des lits doubles
   - Remplissage avant d'ouvrir de nouvelles chambres

## Recommandations

### 1. Exécution Régulière des Tests
- Exécuter `test_overlap_simple.py` après chaque assignation automatique
- Vérifier avant les événements majeurs
- En cas de modifications manuelles des assignations

### 2. Surveillance des Indicateurs
**Dashboard à surveiller**:
- Taux d'occupation des bungalows
- Nombre de participants non assignés
- Conflits potentiels (affichés en rouge)

### 3. Cas d'Usage Critiques à Tester

**Scénario 1: Événements Simultanés**
```
Event A: 01/12 → 10/12 (15 participants)
Event B: 05/12 → 15/12 (20 participants)
→ Période de chevauchement: 05/12 → 10/12 (35 participants en simultané)
→ Capacité totale: 67 lits
→ Status: ✅ OK (52% d'occupation max)
```

**Scénario 2: Arrivées/Départs Échelonnés**
```
Participant A: arrive 01/12, part 05/12 (lit A2-bed1)
Participant B: arrive 06/12, part 10/12 (lit A2-bed1)
→ Status: ✅ OK (pas de chevauchement)

Participant C: arrive 01/12, part 07/12 (lit A2-bed1)
Participant D: arrive 06/12, part 10/12 (lit A2-bed1)
→ Status: ❌ ERREUR (présents tous les deux le 06 et 07/12)
```

**Scénario 3: Modification de Dates**
```
Initial: Participant assigné du 01/12 au 10/12
Modification: Prolongation jusqu'au 15/12
→ Risque: Conflit avec nouvelle assignation du 11/12 au 20/12
→ Protection: ✅ Validation avant sauvegarde
```

## Comment Ajouter de Nouveaux Tests

### Structure d'un Test
```python
def test_mon_scenario():
    """Description du scénario testé."""

    # 1. Créer les données de test
    stage = Stage.objects.create(...)
    participant = Participant.objects.create(...)

    # 2. Effectuer l'action à tester
    result = assign_participants_automatically_for_stage(stage.id)

    # 3. Vérifier les résultats
    assert result['success'] == True
    assert no_overlaps_detected()

    # 4. Nettoyer
    cleanup_test_data()
```

### Checklist de Validation
- [ ] Le test crée ses propres données (isolation)
- [ ] Le test nettoie après lui-même
- [ ] Le test vérifie un cas spécifique
- [ ] Le test affiche des messages clairs
- [ ] Le test échoue si le problème existe

## Support

Pour toute question ou problème avec les tests:
1. Vérifier les logs d'erreur
2. Exécuter `test_overlap_simple.py` pour l'état actuel
3. Consulter la documentation de l'API d'assignation
4. Contacter l'équipe de développement

## Historique des Tests

| Date | Script | Résultat | Notes |
|------|--------|----------|-------|
| 03/12/2025 | test_overlap_simple.py | ✅ PASS | Système sain, aucun problème |
| 03/12/2025 | test_assignment_system.py | ⚠️ WIP | Nécessite mise à jour pour ParticipantStage |

---

**Dernière mise à jour**: 03 Décembre 2025
