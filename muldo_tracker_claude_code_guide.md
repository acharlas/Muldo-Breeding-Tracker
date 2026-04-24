# Muldo Breeding Tracker — Claude Code Step-by-Step Guide

## Pré-requis
- Docker + Docker Compose installés
- Claude Code installé
- Un dossier vide `muldo-tracker/`

---

## PHASE 1 — Initialisation du projet

### Prompt 1 : Scaffolding Docker
```
Crée un projet Docker Compose dans le dossier courant avec 3 services :
- `api` : FastAPI (Python 3.12), port 8000, hot-reload activé
- `frontend` : Next.js 14 (TypeScript, App Router, Tailwind CSS), port 3000
- `db` : PostgreSQL 16, port 5432, user=muldo, password=muldo, db=muldo_tracker

Crée les Dockerfiles pour api et frontend.
Le docker-compose.yml doit monter les sources en volume pour le dev.
Ajoute un .env avec les variables de connexion DB.
Ne mets aucune logique métier, juste le scaffolding avec un healthcheck sur chaque service.
```

### Prompt 2 : Dépendances backend
```
Dans le service api, installe et configure :
- fastapi + uvicorn
- sqlalchemy + asyncpg (async)
- alembic pour les migrations
- pydantic pour les schemas

Crée la structure de dossiers :
api/
  app/
    __init__.py
    main.py (FastAPI app avec CORS pour localhost:3000)
    database.py (engine async + session)
    models/ (vide pour l'instant)
    schemas/ (vide pour l'instant)
    routers/ (vide pour l'instant)
    services/ (vide pour l'instant)
  alembic/
  alembic.ini
  requirements.txt

Vérifie que `docker compose up` lance les 3 services sans erreur.
```

### Prompt 3 : Dépendances frontend
```
Dans le service frontend, installe :
- shadcn/ui (init avec le theme par défaut)
- lucide-react pour les icônes
- zustand pour le state management

Crée la structure :
frontend/
  src/
    app/
      layout.tsx
      page.tsx (juste un "Muldo Tracker" centré)
    components/ (vide)
    lib/
      api.ts (client fetch vers http://localhost:8000)
    types/
      index.ts (vide)

Vérifie que le frontend s'affiche sur localhost:3000.
```

---

## PHASE 2 — Modèle de données

### Prompt 4 : Modèles SQLAlchemy
```
Crée les modèles SQLAlchemy dans api/app/models/models.py :

Table `muldo_species` (données statiques) :
- id: int PK
- name: str unique (ex: "Roux", "Doré et Pourpre")
- generation: int (1 à 10)

Table `breeding_recipe` (recettes statiques) :
- id: int PK
- child_species_id: FK -> muldo_species
- parent_f_species_id: FK -> muldo_species (parent femelle)
- parent_m_species_id: FK -> muldo_species (parent mâle)
- is_optimal: bool default false (la recette choisie pour l'arbre optimal)

Table `muldo_individual` (inventaire live) :
- id: int PK auto
- species_id: FK -> muldo_species
- sex: enum('F', 'M')
- is_fertile: bool default true
- origin: enum('captured', 'bred_success', 'bred_fail', 'cloned')
- parent_f_id: FK nullable -> muldo_individual (mère)
- parent_m_id: FK nullable -> muldo_individual (père)
- created_at: timestamp

Table `breeding_log` (historique des accouplements) :
- id: int PK auto
- parent_f_id: FK -> muldo_individual
- parent_m_id: FK -> muldo_individual
- child_id: FK -> muldo_individual
- target_species_id: FK -> muldo_species (couleur visée)
- success: bool
- cycle_number: int (numéro du cycle de 72h)
- created_at: timestamp

Table `clone_log` (historique des clonages) :
- id: int PK auto
- donor_1_id: FK -> muldo_individual
- donor_2_id: FK -> muldo_individual
- result_id: FK -> muldo_individual
- created_at: timestamp

Crée la migration Alembic initiale et applique-la.
```

### Prompt 5 : Seed des données statiques
```
Crée un script api/app/seed.py qui :

1. Insère les 120 espèces dans muldo_species à partir du JSON suivant :
./muldo_tree.json

2. Insère TOUTES les recettes dans breeding_recipe.

3. Marque is_optimal=true pour les recettes optimisées suivantes :
./opti_recipe.json

4. Ajoute un endpoint GET /api/seed qui exécute le seed (idempotent, skip si déjà fait).
5. Ajoute aussi un endpoint GET /api/species qui retourne toutes les espèces groupées par génération.
6. Ajoute un endpoint GET /api/recipes qui retourne toutes les recettes avec is_optimal.

Teste que les endpoints retournent les bonnes données.
```

---

## PHASE 3 — Logique métier backend

### Prompt 6 : Service d'inventaire
```
Crée api/app/services/inventory.py et api/app/routers/inventory.py :

Endpoints :
- GET /api/inventory : retourne l'inventaire groupé par espèce
  Format : { species_name: { fertile_f: int, fertile_m: int, sterile_f: int, sterile_m: int } }

- POST /api/inventory/capture : ajouter un muldo capturé (sauvage Gen 1)
  Body : { species_name: str, sex: "F"|"M" }
  Crée un muldo_individual avec origin="captured", is_fertile=true

- POST /api/inventory/bulk-capture : ajouter plusieurs muldos captés
  Body : { species_name: str, sex: "F"|"M", count: int }

- DELETE /api/inventory/{id} : supprimer un muldo

- GET /api/inventory/stats : retourne les stats globales
  { total_fertile: int, total_sterile: int, par_gen: { gen: { fertile: int, sterile: int } } }
```

### Prompt 7 : Service d'accouplement
```
Crée api/app/services/breeding.py et api/app/routers/breeding.py :

POST /api/breed :
Body : {
  parent_f_id: int,          // muldo femelle fertile
  parent_m_id: int,          // muldo mâle fertile
  success: bool,             // le joueur indique si succès ou échec
  child_species_name: str,   // couleur de l'enfant obtenu
  child_sex: "F"|"M"         // sexe de l'enfant
}

Logique :
1. Vérifier que parent_f est F, fertile, et parent_m est M, fertile
2. Marquer les 2 parents comme is_fertile=false (stériles)
3. Déterminer l'origin de l'enfant : "bred_success" si success=true, sinon "bred_fail"
4. Créer le muldo_individual enfant (fertile, avec parent_f_id et parent_m_id)
5. Logger dans breeding_log
6. CLONAGE AUTOMATIQUE : après cette opération, checker si il existe
   maintenant 2+ stériles de la même espèce, même sexe, même génération.
   Si oui : supprimer les 2 stériles, créer 1 fertile de même espèce/sexe
   avec origin="cloned". Logger dans clone_log.
   Répéter tant qu'il reste des paires clonables.
7. Retourner : { child: muldo, clones_effectues: [{ species, sex }], updated_inventory: {} }

Validations :
- Les 2 parents doivent être fertiles
- Les 2 parents doivent être de sexes opposés
- Si success=true, vérifier que child_species correspond à une recette valide pour ces 2 parents
```

### Prompt 8 : Service de cascade (besoins)
```
Crée api/app/services/cascade.py et api/app/routers/cascade.py :

GET /api/cascade : retourne les besoins calculés pour chaque espèce

Logique (identique au CSV v8) :
1. L'objectif est 1 de chaque Gen 10 (50 espèces)
2. Pour les Gen 1-9, le besoin = somme des ceil(restant_enfant / 2) pour chaque enfant
   qui utilise cette espèce comme parent dans la recette optimale
3. "restant" = max(0, besoin - fertiles_possédés)
4. La cascade se propage de Gen 10 -> Gen 1

Retour : [
  {
    species_name: str,
    generation: int,
    production_target: int,    // besoin calculé par cascade
    fertile_f: int,            // possédés
    fertile_m: int,
    total_owned: int,
    remaining: int,            // max(0, target - owned)
    status: "ok"|"en_cours"|"a_faire",
    expected_f: int,           // round(target * 0.66)
    expected_m: int            // target - expected_f
  }
]

Ce endpoint est appelé après chaque accouplement pour refresh le tableau.
```

### Prompt 9 : Service de planification d'enclos
```
Crée api/app/services/planner.py et api/app/routers/planner.py :

POST /api/plan :
Body : { enclos_count: int (1-6) }

Logique :
1. Récupérer l'inventaire (fertiles disponibles)
2. Récupérer la cascade (besoins restants)
3. Capacité = enclos_count * 10 places = enclos_count * 5 paires
4. Prioriser les accouplements par :
   a. Génération la plus BASSE en priorité (Gen 1->2 avant Gen 2->3, car on doit
      construire de bas en haut)
   b. Parmi une même gen, prioriser les espèces avec le plus grand "remaining"
   c. Ne proposer que les accouplements pour lesquels on a 1 F fertile + 1 M fertile
      des bonnes espèces
5. Remplir les enclos (5 paires par enclos) avec les meilleurs accouplements

Retour : {
  enclos: [
    {
      enclos_number: int,
      pairs: [
        {
          parent_f: { id, species, sex },
          parent_m: { id, species, sex },
          target_child_species: str,
          success_chance: float   // ((lvl_f + lvl_m) * 0.15 + 30 + 10) / 100, on suppose lvl 50 + opti = 55%
        }
      ]
    }
  ],
  summary: {
    total_pairs: int,
    estimated_successes: float,
    remaining_after: int    // estimation du remaining total si tous réussissent
  }
}
```

### Prompt 10 : Batch résultats d'un cycle
```
Crée un endpoint dans breeding.py :

POST /api/breed/batch :
Body : {
  results: [
    {
      parent_f_id: int,
      parent_m_id: int,
      success: bool,
      child_species_name: str,
      child_sex: "F"|"M"
    }
  ]
}

Logique :
1. Exécuter chaque accouplement séquentiellement (réutilise la logique de POST /api/breed)
2. Le clonage auto se fait APRÈS chaque accouplement individuel
   (car un clonage peut libérer un fertile qui sert au suivant)
3. Incrémenter le cycle_number global (+1 à chaque batch)
4. Retourner le résumé : {
     cycle_number: int,
     total_breeds: int,
     successes: int,
     fails: int,
     clones_auto: int,
     updated_inventory: {},
     updated_cascade: []
   }
```

---

## PHASE 4 — Frontend

### Prompt 11 : Types TypeScript
```
Crée frontend/src/types/index.ts avec les types correspondant à tous les
schemas de réponse du backend (Species, Recipe, MuldoIndividual, Inventory,
CascadeItem, PlanResult, BreedResult, etc.)

Crée frontend/src/lib/api.ts avec les fonctions fetch pour chaque endpoint :
- getSpecies(), getRecipes(), getInventory(), getCascade()
- capture(species, sex, count), breed(parentF, parentM, success, childSpecies, childSex)
- breedBatch(results), getPlan(enclosCount)
- seed()
```

### Prompt 12 : Layout et navigation
```
Crée le layout principal avec 4 onglets de navigation (tabs) :
1. "Cascade" — vue progression Gen 10 -> Gen 1
2. "Inventaire" — vue détaillée du stock par espèce
3. "Enclos" — planification et résultats des cycles
4. "Historique" — log des accouplements et clonages

Utilise shadcn/ui Tabs. Le header affiche :
- Titre "Muldo Tracker"
- Stats rapides : X/120 espèces complétées, Y fertiles en stock, Z cycle actuel

Au premier chargement, appeler GET /api/seed pour initialiser la DB.
```

### Prompt 13 : Vue Cascade
```
Crée le composant CascadeView :

Affiche un tableau avec les colonnes :
- Génération (groupé visuellement, avec un bandeau coloré par gen)
- Couleur (nom de l'espèce)
- Cible (production_target)
- F (~66%)
- M (~33%)
- Possédés (fertile_f + fertile_m)
- Restant
- Barre de progression visuelle
- Statut (badge coloré : vert OK, orange En cours, rouge A faire)

Fonctionnalités :
- Filtre par génération (boutons Gen 1 à Gen 10)
- Les lignes avec remaining=0 sont grisées
- Les espèces avec production_target=0 (pas dans l'arbre optimal) sont masquées par défaut
  avec un toggle "Afficher tout"
- Tri par remaining décroissant par défaut
- Refresh automatique après chaque action

Utilise les données de GET /api/cascade.
```

### Prompt 14 : Vue Inventaire
```
Crée le composant InventoryView :

Pour chaque espèce (groupée par génération) :
- Nom + Gen
- Fertiles F | Fertiles M | Stériles F | Stériles M
- Boutons +/- pour ajouter/retirer manuellement des captures (Gen 1 uniquement)
- Pour Gen 1 : un bouton "Capturer" qui ouvre un mini formulaire (sexe F/M, quantité)

En haut : bouton "Capture en masse" pour Gen 1 :
- Sélectionner l'espèce Gen 1
- Sélectionner le sexe
- Entrer la quantité
- Valider → appelle POST /api/inventory/bulk-capture

Afficher un résumé en haut :
- Total fertiles / stériles
- Par gen : combien de fertiles disponibles
```

### Prompt 15 : Vue Enclos — Planification
```
Crée le composant EnclosView avec 2 sous-vues :

SOUS-VUE 1 : Planification
- Slider ou select pour choisir le nombre d'enclos (1 à 6)
- Bouton "Planifier le cycle" → appelle POST /api/plan
- Affiche le résultat : pour chaque enclos, la liste des 5 paires proposées
  avec parent F, parent M, couleur cible, chance de succès
- Bouton "Lancer le cycle" qui verrouille les paires et passe à la sous-vue résultats

SOUS-VUE 2 : Résultats du cycle
- Pour chaque paire du cycle :
  - Affiche Parent F × Parent M → Cible : [couleur]
  - Deux boutons : "Succès" (vert) et "Échec" (rouge)
  - Si Succès : auto-rempli la couleur enfant = cible, demande juste le sexe (F/M)
  - Si Échec : dropdown pour choisir la couleur obtenue + sexe (F/M)
- Bouton "Valider le cycle" qui envoie tous les résultats en batch
  → appelle POST /api/breed/batch
- Affiche le résumé : X succès, Y échecs, Z clonages auto
- Recalcule et affiche la cascade mise à jour
```

### Prompt 16 : Vue Historique
```
Crée le composant HistoryView :

- Liste paginée de tous les accouplements (breeding_log) et clonages (clone_log)
- Chaque entrée affiche :
  - Date/heure
  - Cycle #
  - Type : Accouplement / Clonage
  - Détails : Parent F + Parent M → Enfant (couleur, sexe)
  - Badge Succès/Échec pour les accouplements
- Filtres : par cycle, par type, par génération
- Stats en haut : taux de succès global, nombre de clonages, etc.
```

---

## PHASE 5 — Polish

### Prompt 17 : Améliorations UX
```
Améliore l'UX :

1. Confirmation avant chaque action destructive (accouplement, suppression)
2. Toast notifications après chaque action (succès, erreur)
3. Loading states sur tous les boutons et tableaux
4. Responsive : le tableau cascade doit scroller horizontalement sur mobile
5. Couleurs : attribue une couleur CSS à chaque espèce Gen 1
   (Doré=#FFD700, Ebène=#2C1A1D, Indigo=#4B0082, Pourpre=#800080, Orchidée=#DA70D6)
   Les Gen 2+ héritent d'un dégradé des couleurs de leurs parents Gen 1
6. Dark mode par défaut (thème sombre, les couleurs des muldos ressortent mieux)
```

### Prompt 18 : Tests et robustesse
```
Ajoute :
1. Tests unitaires Python (pytest) pour :
   - Le calcul de cascade
   - La logique de clonage automatique
   - La validation des accouplements
   - Le service de planification
2. Un endpoint GET /api/health qui vérifie la connexion DB
3. Un endpoint POST /api/reset qui vide l'inventaire et l'historique (avec confirmation)
4. Gestion d'erreurs propre sur tous les endpoints (HTTPException avec messages clairs)
5. Logs structurés (loguru) sur les actions importantes
```

### Prompt 19 : README et documentation
```
Crée un README.md avec :
- Description du projet
- Screenshot placeholder
- Instructions d'installation (docker compose up)
- Architecture (schéma des services)
- Modèle de données
- Guide d'utilisation (workflow type d'un cycle d'élevage)
- Stack technique

Crée aussi un fichier RULES.md qui documente les règles d'élevage Dofus
implémentées dans l'app (chance de succès, clonage, recyclage, cascade).
```

---

## PHASE 6 — Bonus (optionnel)

### Prompt 20 : Dashboard stats
```
Ajoute un dashboard en haut de la page principale :
- Graphique progression globale (% des 120 couleurs obtenues au fil des cycles)
- Estimation du temps restant (cycles restants * 72h)
- Estimation du coût restant en kamas (cycles * coût fécondité + XP)
- Graphique breakdown par génération (barres empilées)
```

### Prompt 21 : Export/Import
```
Ajoute :
- GET /api/export : exporte tout l'état (inventaire + historique) en JSON
- POST /api/import : importe un état JSON (pour backup/restore)
- Bouton "Exporter CSV" dans la vue Cascade (génère le même format que le CSV v8)
- Bouton "Exporter JSON" pour backup complet
```