# 📊 Guide d'Export Excel des Assignations

## Vue d'ensemble

Cette fonctionnalité permet d'exporter les assignations de chambres vers un fichier Excel (.xlsx) avec filtrage par période.

## Comment utiliser

### 1. Accéder à la page Rapports
- Connectez-vous à l'application
- Cliquez sur **"Rapports et Exports"** dans le menu

### 2. Sélectionner une période (optionnel)
- **Date début** : Sélectionnez la date de début de la période
- **Date fin** : Sélectionnez la date de fin de la période
- Si aucune date n'est sélectionnée, **tous les participants** seront exportés

### 3. Exporter
- Cliquez sur le bouton **"Export Assignations Excel"** (vert avec icône Excel)
- Le fichier Excel sera téléchargé automatiquement

## Contenu du fichier Excel

Le fichier Excel contient les colonnes suivantes :

| Colonne | Description |
|---------|-------------|
| **Prénom** | Prénom du participant |
| **Nom** | Nom de famille du participant |
| **Email** | Adresse email |
| **Sexe** | Homme ou Femme |
| **Âge** | Âge du participant |
| **Statut** | Élève, Enseignant-e, Professionnel-le, ou Salarié-e |
| **Langue** | Langue principale |
| **Stage(s)** | Nom(s) du/des stage(s) |
| **Village** | Village (A, B, ou C) |
| **Bungalow** | Nom du bungalow assigné |
| **Lit** | Numéro de lit assigné |
| **Capacité Bungalow** | Capacité totale du bungalow |

## Filtrage par période

Le système filtre intelligemment les participants selon la période sélectionnée :

1. Si vous sélectionnez **1er Janvier 2025** → **31 Janvier 2025**
2. Le système exporte **tous les participants** dont le stage se **chevauche** avec cette période
3. Exemple : Un stage du 15 Janvier au 15 Février sera inclus

### Exemples d'utilisation

#### Exemple 1 : Export de tous les participants
```
Date début : (vide)
Date fin : (vide)
Résultat : Tous les participants assignés
```

#### Exemple 2 : Export pour un stage spécifique
```
Date début : 2025-01-15
Date fin : 2025-02-15
Résultat : Participants dont le stage se déroule durant cette période
```

## Nom du fichier

Le fichier téléchargé aura le format suivant :

- **Avec période** : `Assignations_Chambres_2025-01-15_2025-02-15.xlsx`
- **Sans période** : `Assignations_Chambres_2025-10-13.xlsx` (date du jour)

## Utilisation dans Excel

Une fois le fichier ouvert dans Excel, vous pouvez :

1. **Filtrer** : Utilisez les filtres Excel pour filtrer par village, sexe, stage, etc.
2. **Trier** : Triez par nom, village, bungalow
3. **Analyser** : Créez des tableaux croisés dynamiques
4. **Imprimer** : Les colonnes sont déjà formatées avec des largeurs appropriées

## Astuces

### 💡 Conseil 1 : Occupations par village
Utilisez le filtre Excel sur la colonne **Village** pour voir l'occupation par village.

### 💡 Conseil 2 : Liste par genre
Utilisez le filtre Excel sur la colonne **Sexe** pour séparer hommes et femmes.

### 💡 Conseil 3 : Analyse par stage
Utilisez le filtre Excel sur la colonne **Stage(s)** pour voir les participants par stage.

## Dépannage

### Le fichier ne se télécharge pas
- Vérifiez que votre navigateur autorise les téléchargements
- Vérifiez qu'il y a des participants assignés

### Le fichier est vide
- Vérifiez que des participants sont assignés à des chambres
- Si vous utilisez un filtre de période, vérifiez que des stages existent dans cette période

### Les dates ne fonctionnent pas
- Assurez-vous d'avoir sélectionné à la fois une date de début ET une date de fin
- Le format de date doit être : AAAA-MM-JJ (ex: 2025-01-15)

## Code technique

La fonctionnalité utilise la bibliothèque **xlsx** pour générer les fichiers Excel :

```typescript
// Installation
npm install xlsx

// Utilisation dans le code
import * as XLSX from 'xlsx';
```

## Support

Pour toute question ou problème, contactez l'administrateur système.


