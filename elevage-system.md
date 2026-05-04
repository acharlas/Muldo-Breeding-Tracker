# Élevage Dofus 3.5 — Spec technique

## Concept

Activité de gestion: capturer montures sauvages → les rendre fécondes en enclos → accoupler pour produire des bébés de générations supérieures, débloquant nouvelles couleurs et bonus.

3 types: Dragodindes (bonus Vita), Muldos (bonus PM), Volkornes (bonus PA). Tous s'élèvent identiquement. Niveau 1-200, stats progressent normalement jusqu'à 100, lentement jusqu'à 200.

### Cycle de vie d'une monture
```
Sauvage (gen 1, en zone) 
  → [capture via filet]
Capturée (gen 1, fertile)
  → [remplir End/Mat/Amour à 20000 en enclos]
Féconde
  → [accouplement avec féconde sexe opposé même type]
Stérile (parent) + Bébé (gen N+1, fertile)
  → choix: équiper / vendre HDV / extraire (ressources) / cloner (relancer en fertile)
```

### Définition de génération
- **Gen 1**: monture issue de capture (sauvage). Les couleurs gen 1 sont fixes par type.
- **Gen N**: bébé né d'un accouplement où la combinaison des couleurs des parents définit la nouvelle couleur. Chaque génération supérieure = nouvelle couleur combinée plus rare.
- Couleurs disponibles à l'état sauvage: Dragodindes 3, Volkornes 4, Muldos 5.
- Génération max: 10 (Muldo a 2 nouvelles gen ajoutées en 3.5).
- Logique combinatoire: gen N combine 2 couleurs de gen ≤ N-1 selon arbres parentaux. Drago = 1 croisement par gen cible. Muldo/Volk gen impaires = plusieurs croisements possibles, gen paires = 1 seul.

### Objectifs joueurs typiques
1. Vendre des montures HDV (revenu)
2. Obtenir monture spécifique pour stuff (bonus stats)
3. Succès collection (toutes couleurs gen 2-10)
4. Farm génétons / ressources d'extraction
5. Obtenir capacité spéciale (Caméléone, Reproducteur, etc.)

## Métier Éleveur

### XP métier
- Craft: variable selon recette
- Accouplement: 30 XP × génération × monture (2 montures gen 5 = 300 XP)
- Capture: 30 XP par monture capturée

### Paliers enclos
| Niv | Enclos | Position |
|---|---|---|
| 1 | Débutant | [-18,0] |
| 40 | Novice | [-19,0] |
| 80 | Apprenti | [-20,0] |
| 120 | Initié | [-20,2] |
| 160 | Vétéran | [-19,2] |
| 200 | Maître | [-18,2] |

Max 6 enclos × 10 places = 60 montures en enclos. Lié au compte. Étable = 250 montures max.

### Filets
| Niv | Filet | Effet |
|---|---|---|
| 1 | Universel | 1 cible, tout type |
| 100 | Multiplicateur (par type) | 1 cible + duplique |
| 150 | Renforcé (par type) | Zone cercle r=3 |
| 200 | Multiplicateur renforcé | Zone r=3 + duplique |

Sort "Apprivoisement de monture": 7 PO, sans ligne de vue. Équipé en consommables de combat. État Capture infini, non volable entre joueurs.

### Zones de capture
- Dragodinde: Territoires sauvages, Montagne des Koalaks
- Muldo: Bassin des Muldos, nord de Sufokia
- Volkorne: Haras de Brâkmar, sud de Brâkmar

Toutes les montures sauvages = monstres niv 60.

## Jauges enclos ↔ monture

| Couleur | Jauge enclos | Effet monture |
|---|---|---|
| Violet | Baffeur (-) / Caresseur (+) | Sérénité ±1 |
| Jaune | Foudroyeur | Endurance |
| Bleu | Abreuvoir | Maturité |
| Rouge | Dragofesse | Amour |
| Beige | Mangeoire | XP |

**Règle clé:** max 2 jauges enclos actives simultanément. Effet appliqué toutes les 10s à toutes les montures de l'enclos. Baffeur et Caresseur sont **mutuellement exclusifs** (1 seule des 2 violettes à la fois).

### Carburants — modèle

2 axes indépendants:
- **Tier (1-4)** = plafond de la jauge enclos + vitesse d'application
- **Taille** = durabilité totale (unités fournies avant épuisement)

| Tier | Type | Cap jauge | Niv craft | Débit/tick (10s) |
|---|---|---|---|---|
| 1 | Extrait | 40% | 5 | 10 |
| 2 | Philtre | 70% | 55 | 20 |
| 3 | Potion | 90% | 105 | 30 |
| 4 | Élixir | 100% | 155 | 40 |

| Taille | Durabilité (= unités fournies à la jauge enclos) |
|---|---|
| Minuscule | 1 000 |
| Petit | 2 000 |
| Normal | 3 000 |
| Grand | 4 000 |
| Gigantesque | 5 000 |

### Mécanique exacte
**Le débit est à la fois le gain monture ET la conso de la jauge enclos par tick.**

À chaque tick (10s) si la jauge enclos est active:
- chaque monture de l'enclos gagne `débit` points dans sa jauge correspondante
- la jauge enclos perd `débit` unités de durabilité

Ex. tier 4 actif: chaque monture gagne 40/10s, l'enclos consomme 40/10s. Un Élixir Gigantesque (5000 durabilité) fournit 5000/40 = 125 ticks = 1250s ≈ **20min50s d'activation**, durant lesquelles chaque monture présente gagne 5000 points.

**Implication coût:** la durabilité totale consommée = points gagnés par 1 monture. Avec N montures dans l'enclos, le coût en kamas par point gagné est divisé par N (économie d'échelle directe).

### Modèle de coût (k/xp)

`k/xp = prix_carburant / durabilité` = coût en kamas par point appliqué à 1 monture. Métrique unique de comparaison.

**Comportements marché (HDV, volatil):**
1. **k/xp ne suit pas la taille.** Une Gigantesque peut être > qu'une Petite/u selon offre. Toujours recalculer.
2. **k/xp ne suit pas le tier.** Un Extrait n'est pas toujours moins cher qu'un Philtre/u. Mais tiers supérieurs montent plus vite → on paie aussi le throughput.
3. **k/xp varie par jauge.** Jauges critiques pour la fécondation (Abreuvoir = Maturité, Foudroyeur = Endurance, Dragofesse = Amour) typiquement plus chères/u que jauges accessoires (Baffeur, Caresseur).
4. **Outliers fréquents.** Toujours vérifier le k/xp courant.

**Coût total pour 1 monture jusqu'à féconde** (en isolation):
3 jauges × 20000 points × k/xp_moyen (Foudroyeur, Abreuvoir, Dragofesse) + coût ajustement sérénité (Baffeur/Caresseur).

**Avec N montures en parallèle dans l'enclos:** coût total identique → coût par monture divisé par N. C'est le principal levier d'optimisation économique.

**Tradeoff tier:** tier supérieur = throughput × 4 (tier 1 → 4) mais k/xp variable. Si l'enclos n'est pas plein ou si tu n'as pas besoin de vitesse, tier inférieur avec meilleur k/xp est plus rentable.

## Rendre une monture féconde

### Jauges monture
- Sérénité ∈ [-5000, +5000]
- Endurance, Maturité, Amour ∈ [0, 20000]

**Condition féconde:** End = Mat = Amour = 20000 simultanément.

### Sérénité gating
La sérénité courante détermine quelles jauges peuvent monter:

| Sérénité | Jauges éligibles |
|---|---|
| [-5000, -2001] | Endurance seule |
| [-2000, -1] | Endurance + Maturité |
| [0, +2000] | Maturité + Amour |
| [+2001, +5000] | Amour seul |

Pictogramme:
- 🔴 rouge: Endurance | 🔵 bleu: End+Mat | 🟣 violet: Amour+Mat | 🟢 vert: Amour

### Règles de comportement
- **Aucune jauge ne redescend naturellement.** Endurance/Maturité/Amour ne perdent jamais de valeur. La sérénité se déplace uniquement via Baffeur/Caresseur (pas de dérive passive).
- **Caresseur/Baffeur ne se cumulent pas avec une autre jauge en parallèle.** Si tu actives Caresseur (sérénité ↑), tu ne peux pas activer Foudroyeur/Abreuvoir/Dragofesse simultanément (limite 2 actives + violettes mutuellement exclusives ne suffit pas: la gestion sérénité monopolise ses propres slots).
- Conséquence: phases séquentielles obligatoires. Tu ajustes la sérénité, **puis** tu actives les jauges productives.

### Vitesse sérénité
Caresseur/Baffeur tier T: ±10×T toutes les 10s
- Tier 1: ±10/10s | Tier 2: ±20/10s | Tier 3: ±30/10s | Tier 4: ±40/10s
- Passage -5000 ↔ +5000 (10000 pts) en tier 4: 2500s ≈ 41min40s

### Temps minimum théorique (tier 4)
20000 / 40 × 10s = 5000s ≈ **83min20s** par jauge productive.

Workflow optimal (séquentiel à cause de la mutex sérénité):
1. Amener sérénité dans [-2000, -1] (Baffeur)
2. Activer Foudroyeur + Abreuvoir → End + Mat en parallèle (~83min)
3. Amener sérénité dans [0, +2000] (Caresseur)
4. Activer Dragofesse + Abreuvoir si Mat pas finie, sinon Dragofesse seul (~83min)

Plancher pratique ~3-4h par monture en tier 4 selon ajustements sérénité.

## Accouplement

### Conditions
2 montures fécondes, sexes opposés, **même type**. Pas de croisement inter-types.

### Probabilité génération cible
```
P(cible) = 30%                          (base)
        + 0.15% × niveau_parent_1       (max +30%)
        + 0.15% × niveau_parent_2       (max +30%)
        + 10%   (Optimakina)
        + 20%   (Almanax Takeza ~12 oct)
```
Plafond pratique 100%. Ex: parents niv 200/1 + Optimakina = 70.15%.

### Distribution si plusieurs croisements donnent la cible
P(cible) divisée équitablement entre eux (ex: 8 croisements pour Muldo Émeraude → P/8 chacun).

### Distribution des (100% - P(cible)) restants
Réparti sur les autres résultats possibles selon:
- Présence dans les arbres (parents > grands-parents)
- Génération (haute = moins probable)
- Multiplicité (monture présente N fois = chance ×N)

**INCONNU:** la formule exacte de pondération parents/grands-parents n'est pas publiée. Ne pas inventer.

### Stérilité post-accouplement
2 parents deviennent stériles. Exception: capacité **Reproducteur** sur ≥1 parent → +1 bébé (5% via Animakina, fonctionne aussi sur mâle). 2× Reproducteur = +1 bébé seulement (pas additif).

### Arbre généalogique
Limité aux grands-parents (4 ancêtres max visibles). Au-delà = ignoré dans les calculs.

## XP monture

Source unique: jauge Mangeoire.

| Tier | XP/10s |
|---|---|
| 1 | 10 |
| 2 | 20 |
| 3 | 30 |
| 4 | 40 |

### Formule XP par niveau
```
XP requise pour passer du niveau x au niveau x+1 = ⌈x^1.3 × 10⌉
XP totale niveau 1 = 0
XP totale niveau N = Σ (k=1 à N-1) ⌈k^1.3 × 10⌉
```

Repères (XP cumulée approx):
- Niv 50: ~7 100 XP
- Niv 100: ~35 000 XP
- Niv 150: ~88 000 XP
- Niv 200: ~170 000 XP

À tier 4 (40 XP / 10s = 14 400 XP/h), niv 200 ≈ 12h en mangeoire continue.

## Makinas

3 types × N générations × 3 types de monture. Règle: génération makina ≥ génération cible.

| Makina | Effet | Mode |
|---|---|---|
| Animakina | Capacité aléatoire | probabiliste |
| Kromakina | Caméléone | 100% |
| Optimakina | +10% gen cible | déterministe |

### Animakina — table des capacités
| Capacité | Effet | Proba |
|---|---|---|
| Amoureuse | Gain amour ×2 | 27% |
| Endurante | Gain endurance ×2 | 27% |
| Précoce | Gain maturité ×2 | 27% |
| Sage | Gain XP ×2 | 14% |
| Reproducteur | +1 bébé/accouplement | 5% |

Total 100%. Caméléone (couleurs adaptées au perso équipé) uniquement via Kromakina.

## Clonage

2 montures même type + même génération → 1 nouvelle monture **fertile**. Conserve genre + généalogie. Jauges reset. Utilité principale: relancer parents stériles post-accouplement.

## Extraction

Détruit la monture → ressources selon type:
- Dragodinde → Neurone de dragodinde
- Muldo → Ambre de muldo
- Volkorne → Corne de volkorne

**Quantité = génération de la monture** (gen 5 → 5 ressources). Gen 1 = inextractible. Montures séniles (pré-3.5) = 1 ressource peu importe gen.

Usage aval: craft d'équipements (filets supérieurs, makinas, autres recettes éleveur).

## Génétons

Récompense d'accouplement, **conditionnelle**: bébé doit avoir une génération **strictement supérieure** à toutes les montures des arbres généalogiques des 2 parents. Sinon = 0 généton (même si génération cible atteinte).

Gain selon génération du **bébé**:
| Gen bébé | Génétons |
|---|---|
| 1 | 1 |
| 2 | 2 |
| 3 | 4 |
| 4 | 8 |
| 5 | 15 |
| 6 | 30 |
| 7 | 60 |
| 8 | 120 |
| 9 | 250 |

Note: l'exemple officiel "gen 9 + gen 1 → bébé gen 10 = 251 génétons" suggère que le palier gen 10 = 1 généton bonus, ou que la formule additionne. **À confirmer en pratique.**

Échange chez **Eugène Éton** [-18,1].

## Inconnues notables (ne pas inventer)
1. Formule exacte de pondération parents vs grands-parents dans la distribution des résultats hors génération cible.
2. Barème complet d'échange des génétons.
3. Liste exhaustive des couleurs et croisements par type (cf pages dédiées).
4. Tables d'XP métier éleveur (XP requise pour 1→200).
5. Recettes de craft (carburants, filets, makinas).