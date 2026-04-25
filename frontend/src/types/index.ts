export type CascadeItem = {
  species_name: string
  generation: number
  production_target: number
  fertile_f: number
  fertile_m: number
  total_owned: number
  remaining: number
  status: 'ok' | 'en_cours' | 'a_faire'
  expected_f: number
  expected_m: number
}

export type InventoryEntry = {
  fertile_f: number
  fertile_m: number
  sterile_f: number
  sterile_m: number
}

export type InventoryStats = {
  total_fertile: number
  total_sterile: number
  par_gen: Record<string, { fertile: number; sterile: number }>
}

export type MuldoOut = {
  id: number
  species_name: string
  generation: number
  sex: 'F' | 'M'
  is_fertile: boolean
  origin: string
  created_at: string
}

export type PlannedParent = {
  id: number
  species_name: string
  sex: 'F' | 'M'
}

export type PlannedPair = {
  parent_f: PlannedParent
  parent_m: PlannedParent
  target_child_species: string
  success_chance: number
}

export type PlannedEnclos = {
  enclos_number: number
  pairs: PlannedPair[]
}

export type PlanResult = {
  enclos: PlannedEnclos[]
  summary: {
    total_pairs: number
    estimated_successes: number
    remaining_after: number
  }
}

export type BreedRequest = {
  parent_f_id: number
  parent_m_id: number
  success: boolean
  child_species_name: string
  child_sex: 'F' | 'M'
}

export type BatchBreedError = {
  index: number
  detail: string
}

export type BatchBreedResult = {
  cycle_number: number
  total: number
  successes: number
  errors: BatchBreedError[]
}

export type PairResult = {
  success: boolean
  child_species_name: string
  child_sex: 'F' | 'M'
}
