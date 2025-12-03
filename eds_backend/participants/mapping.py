"""
romming module for assigning participants to rooms based on constraints.
enter : list of participants with their attributes (type, start date, end date, sexe, age, languages, stage)
        rooms with their attributes (type, capacity, village)
        liste : current room assignments
exit :  list of tuples (Participant, room) for each Participant in the list,
        erreur : list of participants who could not be assigned a room


"""
from datetime import date
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

def difference_date(d1,d2):
    """Calcule la différence en jours entre deux dates d1 et d2.
    Les dates sont des tuples (année, mois, jour).
    Renvoie un entier positif.
    """
    
    date1 = date(d1[0], d1[1], d1[2])
    date2 = date(d2[0], d2[1], d2[2])
    return abs((date2 - date1).days)

def cost(persons):
     
    if len(persons)==2:
        if persons[0]["end"] < persons[1]["start"] or persons[0]["start"] > persons[1]["end"]:
            return float('inf')
        c=0
        c+=abs(persons[0]["age"]-persons[1]["age"])
        c+=difference_date(persons[0]["start"],persons[1]["start"])
        c+=difference_date(persons[0]["end"],persons[1]["end"])
        if len(set(persons[0]["langage"]).intersection(set(persons[1]["langage"])))!=0:
            c+=10
    else:
        c=0
        c+=cost(persons[:2])
        c+=cost(persons[1:])
        c+=cost(persons[::2])
        c/=3
    return c

    
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
                chambre.append((room,cost([P]+[people[n] for n in liste[room]])))
        if len(chambre)>0:
            chambre.sort(key=lambda x:x[1],reverse=True)
            liste[chambre[0]].append(name)
        else:
            erreur.append(name)
    


    return liste,erreur

def groupe(liste,people):
    grp=[] #***************************************************************
    return grp

def rooming_V2(people,rooms,liste):
    """Renvoie une liste de tuples (Personne, chambre) pour chaque Personne
    dans la liste Personne, en respectant les contraintes de debut et fin
    (incluses) et la contrainte de chambre (un entier).
    """
    erreur = []
    groupe=groupe(liste,people)
    
    for G1 in groupe:
        if len(G1)>=3:
            continue

        for G2 in groupe:
            if G1!=G2:
                for person1 in G1:
                    for person2 in G2:
                        #try to swap person1 and person2
                        pass

    return liste,erreur
print(rooming(people,rooms,liste))