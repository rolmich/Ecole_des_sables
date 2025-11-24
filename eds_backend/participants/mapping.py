"""
romming module for assigning participants to rooms based on constraints.
enter : list of participants with their attributes (type, start date, end date, sexe, age, languages, stage)
        rooms with their attributes (type, capacity, village)
        liste : current room assignments
exit :  list of tuples (Participant, room) for each Participant in the list,
        erreur : list of participants who could not be assigned a room


"""

rooms = {
    "A1": {"type": "A", "capacity": 3, "village": "A"},
    "A2": {"type": "B", "capacity": 2, "village": "A"},  # double bed
    "B1": {"type": "A", "capacity": 3, "village": "B"},
    "B2": {"type": "B", "capacity": 2, "village": "B"},  # double bed
    "C1": {"type": "A", "capacity": 3, "village": "C"}}

people = {
    "E1": {"person": "student", "start": (2025, 5, 12), "end": (2025, 5, 19), "sexe": "Male",   "age": 20, "langage": ["French", "English"], "stage": "S1"},
    "E2": {"person": "student", "start": (2025, 5, 13), "end": (2025, 5, 18), "sexe": "Female", "age": 21, "langage": ["French", "Spanish"], "stage": "S2"},
    "E3": {"person": "student", "start": (2025, 5, 12), "end": (2025, 5, 20), "sexe": "Female", "age": 19, "langage": ["French", "English"], "stage": "S3"},
    "E4": {"person": "student", "start": (2025, 5, 14), "end": (2025, 5, 19), "sexe": "Male",   "age": 22, "langage": ["French", "German"], "stage": "S1"},
    "E5": {"person": "student", "start": (2025, 5, 13), "end": (2025, 5, 16), "sexe": "Female", "age": 20, "langage": ["French", "Italian"], "stage": "S2"},
    "E6": {"person": "student", "start": (2025, 5, 15), "end": (2025, 5, 19), "sexe": "Male",   "age": 23, "langage": ["French", "English"], "stage": "S3"},
    "E7": {"person": "student", "start": (2025, 5, 12), "end": (2025, 5, 14), "sexe": "Female", "age": 18, "langage": ["French"], "stage": "S1"},
    "E8": {"person": "student", "start": (2025, 5, 16), "end": (2025, 5, 18), "sexe": "Male",   "age": 21, "langage": ["French", "Spanish"], "stage": "S2"},
    "E9": {"person": "student", "start": (2025, 5, 14), "end": (2025, 5, 17), "sexe": "Female", "age": 20, "langage": ["French", "English"], "stage": "S3"},
    "T1": {"person": "teacher", "start": (2025, 5, 12), "end": (2025, 5, 20), "sexe": "Male",   "age": 45, "langage": ["French", "English"], "stage": "S1"},
    "T2": {"person": "teacher", "start": (2025, 5, 13), "end": (2025, 5, 13), "sexe": "Female", "age": 34, "langage": ["French", "English"], "stage": "S2"},
    "T3": {"person": "teacher", "start": (2025, 5, 14), "end": (2025, 5, 15), "sexe": "Male",   "age": 50, "langage": ["French", "German"], "stage": "S3"},
    "T4": {"person": "teacher", "start": (2025, 5, 16), "end": (2025, 5, 18), "sexe": "Female", "age": 29, "langage": ["French", "Italian"], "stage": "S1"},
    "T5": {"person": "teacher", "start": (2025, 5, 12), "end": (2025, 5, 20), "sexe": "Male",   "age": 55, "langage": ["French", "English"], "stage": "S2"},
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

def valeur(room,Person,liste):
    val=0
    for p in liste[room]:
        P=people[p]
        val
    val=Person["age"]-len(liste[room])*5
    return val

def rooming(people,rooms,liste):
    """Renvoie une liste de tuples (Personne, chambre) pour chaque Personne
    dans la liste Personne, en respectant les contraintes de debut et fin
    (incluses) et la contrainte de chambre (un entier).
    """
    erreur = []
    for name in people:
        P=people[name]
        for room in rooms:
            chambre=[]
            if room_free(room,liste, P):
                chambre.append(room,valeur(room,P,liste))
        if len(chambre)>0:
            chambre.sort(key=lambda x:x[1],reverse=True)
            liste[chambre[0]].append(name)
        else:
            erreur.append(name)
    


    return liste,erreur
print(rooming(people,rooms,liste))