rooms = {
    "A1": {"type": "A", "capacity": 3, "village": "A"},
    "A2": {"type": "B", "capacity": 2, "village": "A"},  # double bed
    "B1": {"type": "A", "capacity": 3, "village": "B"},
    "B2": {"type": "B", "capacity": 2, "village": "B"},  # double bed
    "C1": {"type": "A", "capacity": 3, "village": "C"}}

people = {
    "E1": {"person": "student", "start": (2025, 5, 12), "end": (2025, 5, 19), 'sexe': 'Male', "age": 20, "langage": ["French", "English"]},
    "E2": {"person": "student", "start": (2025, 5, 13), "end": (2025, 5, 18), 'sexe': 'Female', "age": 21, "langage": ["French", "Spanish"]},
    "E3": {"person": "student", "start": (2025, 5, 12), "end": (2025, 5, 20), 'sexe': 'Female', "age": 19, "langage": ["French", "English"]},
    "E4": {"person": "student", "start": (2025, 5, 14), "end": (2025, 5, 19), 'sexe': 'Male', "age": 22, "langage": ["French", "German"]},
    "E5": {"person": "student", "start": (2025, 5, 13), "end": (2025, 5, 16), 'sexe': 'Female', "age": 20, "langage": ["French", "Italian"]},
    "E6": {"person": "student", "start": (2025, 5, 15), "end": (2025, 5, 19), 'sexe': 'Male', "age": 23, "langage": ["French", "English"]},
    "E7": {"person": "student", "start": (2025, 5, 12), "end": (2025, 5, 14), 'sexe': 'Female', "age": 18, "langage": ["French"]},
    "E8": {"person": "student", "start": (2025, 5, 16), "end": (2025, 5, 18), 'sexe': 'Male', "age": 21, "langage": ["French", "Spanish"]},
    "E9": {"person": "student", "start": (2025, 5, 14), "end": (2025, 5, 17), 'sexe': 'Female', "age": 20, "langage": ["French", "English"]},
    "T1": {"person": "teacher", "start": (2025, 5, 12), "end": (2025, 5, 20), 'sexe': 'Male', "age": 45, "langage": ["French", "English"]},
    "T2": {"person": "teacher", "start": (2025, 5, 13), "end": (2025, 5, 13), 'sexe': 'Female', "age": 34, "langage": ["French", "English"]},
    "T3": {"person": "teacher", "start": (2025, 5, 14), "end": (2025, 5, 15), 'sexe': 'Male', "age": 50, "langage": ["French", "German"]},
    "T4": {"person": "teacher", "start": (2025, 5, 16), "end": (2025, 5, 18), 'sexe': 'Female', "age": 29, "langage": ["French", "Italian"]},
    "T5": {"person": "teacher", "start": (2025, 5, 12), "end": (2025, 5, 20), 'sexe': 'Male', "age": 55, "langage": ["French", "English"]},
}
liste = {room: [] for room in rooms}



def contrainte(Person,room):
    return True

def room_free(room,liste,Person):
    start=Person["start"]
    end=Person["end"]
    capcity=rooms[room]["capacity"]

    for name in liste[room]:
        P=people[name]
        if not (end < P["start"] or start > P["end"]):
            if P["person"]=="teacher":
                return False
            if P["sexe"]!=Person['sexe']:
                return False
            capcity-=1
            if capcity==0:
                return False
    return True


def rooming(people,rooms,liste):
    """Renvoie une liste de tuples (Personne, chambre) pour chaque Personne
    dans la liste Personne, en respectant les contraintes de debut et fin
    (incluses) et la contrainte de chambre (un entier).
    """
    
    for name in people:
        P=people[name]
        for room in rooms:
            
            if room_free(room,liste, P) and contrainte(P,room):
                liste[room].append(name)
                break
    


    return liste
print(rooming(people,rooms,liste))