/**
 * Optional starter formulas bundled with the app.
 *
 * Students add their own formulas in Formula Sheet; this set is only a one-tap
 * import so the sheet is not empty on day one. Imported formulas become the
 * student's own records and are fully editable.
 */
import type { MyFormula } from './model';

export type Formula = {
  id: string;
  subjectId: string;
  name: string;
  expression: string;
  note?: string;
  tags: string[];
};

export const FORMULAS: readonly Formula[] = [
  /* ----------------------------------------------------------- Physics */
  {
    id: 'phy-1',
    subjectId: 'physics',
    name: 'Newton’s second law',
    expression: 'F = ma',
    note: 'Resultant force = mass × acceleration.',
    tags: ['force', 'motion'],
  },
  {
    id: 'phy-2',
    subjectId: 'physics',
    name: 'First equation of motion',
    expression: 'v = u + at',
    tags: ['motion', 'velocity', 'acceleration'],
  },
  {
    id: 'phy-3',
    subjectId: 'physics',
    name: 'Displacement',
    expression: 's = ut + ½at²',
    tags: ['motion', 'displacement'],
  },
  {
    id: 'phy-4',
    subjectId: 'physics',
    name: 'Kinetic energy',
    expression: 'Eₖ = ½mv²',
    tags: ['energy', 'kinetic'],
  },
  {
    id: 'phy-5',
    subjectId: 'physics',
    name: 'Gravitational potential energy',
    expression: 'Eₚ = mgh',
    tags: ['energy', 'potential', 'gravity'],
  },
  {
    id: 'phy-6',
    subjectId: 'physics',
    name: 'Ohm’s law',
    expression: 'V = IR',
    note: 'The gradient of a V–I graph is the resistance.',
    tags: ['electricity', 'resistance'],
  },
  {
    id: 'phy-7',
    subjectId: 'physics',
    name: 'Electrical power',
    expression: 'P = VI = I²R',
    tags: ['electricity', 'power'],
  },
  {
    id: 'phy-8',
    subjectId: 'physics',
    name: 'Density',
    expression: 'ρ = m / V',
    tags: ['density', 'mass', 'volume'],
  },

  /* --------------------------------------------------------- Chemistry */
  {
    id: 'chem-1',
    subjectId: 'chemistry',
    name: 'Moles from mass',
    expression: 'n = m / M',
    note: 'Divide mass in grams by molar mass in g/mol.',
    tags: ['moles', 'mass'],
  },
  {
    id: 'chem-2',
    subjectId: 'chemistry',
    name: 'Concentration',
    expression: 'c = n / V',
    note: 'Use V in dm³ (cm³ ÷ 1000).',
    tags: ['concentration', 'solution'],
  },
  {
    id: 'chem-3',
    subjectId: 'chemistry',
    name: 'pH',
    expression: 'pH = −log₁₀[H⁺]',
    tags: ['acid', 'base', 'ph'],
  },
  {
    id: 'chem-4',
    subjectId: 'chemistry',
    name: 'Heat energy change',
    expression: 'Q = mcΔT',
    tags: ['thermochemistry', 'heat'],
  },
  {
    id: 'chem-5',
    subjectId: 'chemistry',
    name: 'Ideal gas equation',
    expression: 'pV = nRT',
    note: 'R = 8.31 J mol⁻¹ K⁻¹; T in kelvin.',
    tags: ['gas', 'pressure'],
  },
  {
    id: 'chem-6',
    subjectId: 'chemistry',
    name: 'Percentage yield',
    expression: '% yield = (actual / theoretical) × 100',
    tags: ['yield', 'reaction'],
  },
  {
    id: 'chem-7',
    subjectId: 'chemistry',
    name: 'Number of particles',
    expression: 'N = n × 6.02 × 10²³',
    note: 'Avogadro constant: particles per mole.',
    tags: ['moles', 'avogadro', 'particles'],
  },

  /* ------------------------------------------------------------ Biology */
  {
    id: 'bio-1',
    subjectId: 'biology',
    name: 'Magnification',
    expression: 'magnification = image size / actual size',
    tags: ['microscope', 'cells'],
  },
  {
    id: 'bio-2',
    subjectId: 'biology',
    name: 'Aerobic respiration',
    expression: 'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + energy',
    tags: ['respiration', 'energy'],
  },
  {
    id: 'bio-3',
    subjectId: 'biology',
    name: 'Photosynthesis',
    expression: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂',
    note: 'Uses light energy trapped by chlorophyll.',
    tags: ['photosynthesis', 'plant'],
  },
  {
    id: 'bio-4',
    subjectId: 'biology',
    name: 'Cardiac output',
    expression: 'cardiac output = heart rate × stroke volume',
    tags: ['heart', 'circulation'],
  },
  {
    id: 'bio-5',
    subjectId: 'biology',
    name: 'Pulmonary ventilation rate',
    expression: 'ventilation = breathing rate × tidal volume',
    tags: ['lung', 'ventilation'],
  },
  {
    id: 'bio-6',
    subjectId: 'biology',
    name: 'Surface area to volume ratio',
    expression: 'SA : V = surface area / volume',
    note: 'Larger organisms have a smaller ratio, so they need specialised exchange surfaces.',
    tags: ['exchange', 'ratio'],
  },

  /* -------------------------------------------------------- Agriculture */
  {
    id: 'agri-1',
    subjectId: 'agriculture',
    name: 'Plant population',
    expression: 'plants per m² = 1 / (spacing in m)²',
    tags: ['spacing', 'population'],
  },
  {
    id: 'agri-2',
    subjectId: 'agriculture',
    name: 'Nutrient content of fertiliser',
    expression: 'kg of nutrient = (kg fertiliser × % nutrient) / 100',
    tags: ['fertiliser', 'npk'],
  },
  {
    id: 'agri-3',
    subjectId: 'agriculture',
    name: 'Irrigation requirement',
    expression: 'irrigation = evapotranspiration − rainfall',
    tags: ['water', 'irrigation'],
  },
  {
    id: 'agri-4',
    subjectId: 'agriculture',
    name: 'Germination percentage',
    expression: '% germination = (seeds germinated / seeds sown) × 100',
    tags: ['seed', 'germination'],
  },
  {
    id: 'agri-5',
    subjectId: 'agriculture',
    name: 'Yield per hectare',
    expression: 'yield = total harvest mass / area in hectares',
    tags: ['yield', 'harvest'],
  },
  {
    id: 'agri-6',
    subjectId: 'agriculture',
    name: 'Seed rate',
    expression: 'seed rate = (target plants per m² × seed mass) / % germination',
    note: 'Multiply by 100 for percentages.',
    tags: ['seed', 'sowing'],
  },

  /* ----------------------------------------------------------- Writing */
  {
    id: 'wri-1',
    subjectId: 'writing',
    name: 'Reading time',
    expression: 'minutes = words / 200',
    note: 'Average reading speed is about 200 words per minute.',
    tags: ['reading', 'time'],
  },
  {
    id: 'wri-2',
    subjectId: 'writing',
    name: 'Section word budget',
    expression: 'section words = total words × share',
    tags: ['planning', 'structure'],
  },
  {
    id: 'wri-3',
    subjectId: 'writing',
    name: 'Quotation limit',
    expression: 'quoted words ≤ 10% of the essay',
    tags: ['quote', 'originality'],
  },
  {
    id: 'wri-4',
    subjectId: 'writing',
    name: 'Citation density',
    expression: 'citations ≈ words / 150',
    note: 'A rough check that every claim is supported.',
    tags: ['citation', 'evidence'],
  },
  {
    id: 'wri-5',
    subjectId: 'writing',
    name: 'Average sentence length',
    expression: 'average words = words / sentences',
    note: 'Aim for 15–20 words per sentence for clarity.',
    tags: ['style', 'clarity'],
  },
  {
    id: 'wri-6',
    subjectId: 'writing',
    name: 'Paragraph rule',
    expression: 'one main idea per paragraph',
    tags: ['paragraph', 'structure'],
  },
];

/** Bundled examples, with ids namespaced so they never collide with user data. */
export const STARTER_FORMULAS: MyFormula[] = FORMULAS.map((formula) => ({
  id: `starter-${formula.id}`,
  subjectId: formula.subjectId,
  name: formula.name,
  expression: formula.expression,
  ...(formula.note ? { note: formula.note } : {}),
  tags: [...formula.tags],
  createdAt: 0,
}));
