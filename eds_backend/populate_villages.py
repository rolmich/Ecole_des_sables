#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script pour peupler et synchroniser les villages et bungalows depuis un fichier JSON.

Inspiré du système de LinkedCorp pour job titles et skills.

Usage:
    python populate_villages.py

Le script va:
1. Lire le fichier villages_bungalows.json
2. Créer/mettre à jour les villages
3. Créer/mettre à jour les bungalows pour chaque village
4. Supprimer les villages/bungalows qui ne sont plus dans le fichier
"""

import os
import sys
import json
import django

# Fix pour Windows - encoder en UTF-8
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Configuration Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", 'eds_backend.settings')
django.setup()

from participants.models import Village, Bungalow


def get_bed_configuration(bungalow_type):
    """
    Retourne la configuration des lits selon le type de bungalow.
    
    Type A: 3 lits simples
    Type B: 1 lit simple + 1 lit double
    """
    if bungalow_type == 'A':
        return [
            {"id": "bed1", "type": "single", "occupiedBy": None},
            {"id": "bed2", "type": "single", "occupiedBy": None},
            {"id": "bed3", "type": "single", "occupiedBy": None}
        ]
    elif bungalow_type == 'B':
        return [
            {"id": "bed1", "type": "single", "occupiedBy": None},
            {"id": "bed2", "type": "double", "occupiedBy": None}
        ]
    else:
        raise ValueError(f"Type de bungalow invalide: {bungalow_type}")


def get_capacity(bungalow_type):
    """Retourne la capacité selon le type de bungalow."""
    return 3 if bungalow_type == 'A' else 2


def get_amenities(village_name, amenities_type):
    """Retourne les équipements selon le village et le type."""
    base_amenities = []
    
    if amenities_type == 'shared':
        base_amenities.append('shared_bathroom')
    elif amenities_type == 'private':
        base_amenities.append('private_bathroom')
    
    return base_amenities


def load_configuration(file_path='villages_bungalows.json'):
    """Charge le fichier de configuration JSON."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(script_dir, file_path)
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"[ERROR] Fichier de configuration non trouve: {config_path}")
        raise
    except json.JSONDecodeError as e:
        print(f"[ERROR] Erreur de parsing JSON: {e}")
        raise


def populate_villages_and_bungalows():
    """
    Peuple ou met à jour les villages et bungalows dans la base de données.
    
    Logique de synchronisation:
    - Les villages et bungalows dans le fichier sont créés/mis à jour
    - Les villages et bungalows absents du fichier sont supprimés
    - Les lits déjà occupés sont préservés lors de la mise à jour
    """
    
    print("[VILLAGES] Demarrage de la synchronisation des villages et bungalows...")
    
    # Charger la configuration
    config = load_configuration()
    villages_config = config.get('villages', {})
    
    # Suivre les villages existants
    existing_villages = {v.name: v for v in Village.objects.all()}
    processed_villages = set()
    
    # Statistiques
    stats = {
        'villages_created': 0,
        'villages_updated': 0,
        'villages_deleted': 0,
        'bungalows_created': 0,
        'bungalows_updated': 0,
        'bungalows_deleted': 0
    }
    
    # Traiter chaque village dans le fichier de configuration
    for village_name, village_data in villages_config.items():
        amenities_type = village_data.get('amenities_type', 'shared')
        bungalows_config = village_data.get('bungalows', {})
        
        # Créer ou récupérer le village
        village, created = Village.objects.get_or_create(
            name=village_name,
            defaults={'amenities_type': amenities_type}
        )
        
        if created:
            print(f"[OK] Village {village_name} cree")
            stats['villages_created'] += 1
        else:
            # Mettre à jour si nécessaire
            if village.amenities_type != amenities_type:
                village.amenities_type = amenities_type
                village.save()
                print(f"[UPDATE] Village {village_name} mis a jour")
                stats['villages_updated'] += 1
            
            # Retirer des villages existants (déjà traité)
            if village_name in existing_villages:
                del existing_villages[village_name]
        
        processed_villages.add(village_name)
        
        # Suivre les bungalows existants pour ce village
        existing_bungalows = {b.name: b for b in village.bungalows.all()}
        
        # Traiter chaque bungalow
        for bungalow_name, bungalow_data in bungalows_config.items():
            bungalow_type = bungalow_data.get('type', 'A')
            capacity = get_capacity(bungalow_type)
            bed_config = get_bed_configuration(bungalow_type)
            amenities = get_amenities(village_name, amenities_type)
            
            # Créer ou récupérer le bungalow
            bungalow, created = Bungalow.objects.get_or_create(
                village=village,
                name=bungalow_name,
                defaults={
                    'type': bungalow_type,
                    'capacity': capacity,
                    'beds': bed_config,
                    'amenities': amenities,
                    'occupancy': 0
                }
            )
            
            if created:
                print(f"  [OK] Bungalow {village_name}-{bungalow_name} (Type {bungalow_type}) cree")
                stats['bungalows_created'] += 1
            else:
                # Mettre à jour si le type a changé
                updated = False
                
                if bungalow.type != bungalow_type:
                    # Si le type change, réinitialiser les lits (à moins qu'ils soient occupés)
                    if bungalow.occupancy == 0:
                        bungalow.type = bungalow_type
                        bungalow.capacity = capacity
                        bungalow.beds = bed_config
                        bungalow.amenities = amenities
                        updated = True
                    else:
                        print(f"  [WARN] Bungalow {village_name}-{bungalow_name} est occupe, type non modifie")
                
                if bungalow.amenities != amenities:
                    bungalow.amenities = amenities
                    updated = True
                
                if updated:
                    bungalow.save()
                    print(f"  [UPDATE] Bungalow {village_name}-{bungalow_name} mis a jour")
                    stats['bungalows_updated'] += 1
                
                # Retirer des bungalows existants (déjà traité)
                if bungalow_name in existing_bungalows:
                    del existing_bungalows[bungalow_name]
        
        # Supprimer les bungalows qui ne sont plus dans le fichier
        for bungalow_name, bungalow in existing_bungalows.items():
            if bungalow.occupancy > 0:
                print(f"  [WARN] Bungalow {village_name}-{bungalow_name} est occupe, suppression annulee")
            else:
                bungalow.delete()
                print(f"  [DELETE] Bungalow {village_name}-{bungalow_name} supprime (absent du fichier)")
                stats['bungalows_deleted'] += 1
    
    # Supprimer les villages qui ne sont plus dans le fichier
    for village_name, village in existing_villages.items():
        # Vérifier si des bungalows sont occupés
        occupied_count = village.bungalows.filter(occupancy__gt=0).count()
        
        if occupied_count > 0:
            print(f"[WARN] Village {village_name} a {occupied_count} bungalow(s) occupe(s), suppression annulee")
        else:
            # Supprimer tous les bungalows du village
            bungalow_count = village.bungalows.count()
            village.bungalows.all().delete()
            stats['bungalows_deleted'] += bungalow_count
            
            # Supprimer le village
            village.delete()
            print(f"[DELETE] Village {village_name} supprime (absent du fichier)")
            stats['villages_deleted'] += 1
    
    # Afficher les statistiques
    print("\n" + "="*60)
    print("RESUME DE LA SYNCHRONISATION:")
    print("="*60)
    print(f"Villages:")
    print(f"  - Crees: {stats['villages_created']}")
    print(f"  - Mis a jour: {stats['villages_updated']}")
    print(f"  - Supprimes: {stats['villages_deleted']}")
    print(f"Bungalows:")
    print(f"  - Crees: {stats['bungalows_created']}")
    print(f"  - Mis a jour: {stats['bungalows_updated']}")
    print(f"  - Supprimes: {stats['bungalows_deleted']}")
    print("="*60)
    print("[SUCCESS] Synchronisation terminee avec succes!")
    
    return stats


if __name__ == "__main__":
    try:
        populate_villages_and_bungalows()
    except Exception as e:
        print(f"\n[ERROR] Erreur lors de la synchronisation: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

