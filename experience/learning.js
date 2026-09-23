"use strict";

const REACTION_LESSONS = {
  WATER: {
    name: "Water", formula: "H₂O", kind: "Molecular compound", state: "Liquid at room temperature",
    bonding: "Two hydrogen atoms share electrons with one oxygen atom. The molecule has a bent shape and an uneven distribution of charge: it is polar.",
    everyday: "Water's polarity helps it dissolve many ionic and polar substances, making it an important solvent in living things.",
    source: "https://pubchem.ncbi.nlm.nih.gov/compound/Water"
  },
  CRYSTAL: {
    name: "Sodium chloride", formula: "NaCl", kind: "Ionic compound", state: "Solid at room temperature",
    bonding: "Sodium loses an electron and chlorine gains one, forming Na⁺ and Cl⁻ ions. Opposite charges attract in a repeating crystal lattice. NaCl describes their 1:1 ratio, not a separate molecule.",
    everyday: "This is the main compound in table salt. When it dissolves in water, its ions separate and the solution can conduct electricity.",
    source: "https://pubchem.ncbi.nlm.nih.gov/compound/Sodium-Chloride"
  },
  CARBON: {
    name: "Carbon dioxide", formula: "CO₂", kind: "Molecular compound", state: "Gas at room temperature",
    bonding: "One carbon atom forms a double covalent bond with each of two oxygen atoms. The three atoms form a straight line.",
    everyday: "Plants use carbon dioxide during photosynthesis. It is also the gas that makes bubbles in carbonated drinks.",
    source: "https://pubchem.ncbi.nlm.nih.gov/compound/Carbon-Dioxide"
  },
  AMMONIA: {
    name: "Ammonia", formula: "NH₃", kind: "Molecular compound", state: "Gas at room temperature",
    bonding: "One nitrogen atom shares electrons with three hydrogen atoms. A lone pair of electrons on nitrogen gives the molecule a pyramidal shape.",
    everyday: "Ammonia is used to make fertilizers. Industrial production combines nitrogen and hydrogen under controlled temperature and pressure with a catalyst.",
    source: "https://pubchem.ncbi.nlm.nih.gov/compound/Ammonia"
  },
  METHANE: {
    name: "Methane", formula: "CH₄", kind: "Molecular compound", state: "Gas at room temperature",
    bonding: "One carbon atom shares electrons with four hydrogen atoms. Its four bonds point toward the corners of a tetrahedron.",
    everyday: "Methane is the main component of natural gas. It can also be produced when microbes break down organic matter without oxygen.",
    source: "https://pubchem.ncbi.nlm.nih.gov/compound/Methane"
  },
  HYDROGEN: {
    name: "Hydrogen", formula: "H₂", kind: "Elemental molecule", state: "Gas at room temperature",
    bonding: "Two hydrogen atoms share one pair of electrons in a single covalent bond. It is a molecule, but not a compound: both atoms are the same element.",
    everyday: "Hydrogen is used to make ammonia and can supply fuel cells, where it reacts with oxygen to produce electricity and water.",
    source: "https://periodic-table.rsc.org/element/1/hydrogen"
  },
  OXYGEN: {
    name: "Oxygen", formula: "O₂", kind: "Elemental molecule", state: "Gas at room temperature",
    bonding: "Two oxygen atoms form a molecule with a double covalent bond. Because it contains only oxygen, it is an elemental molecule rather than a compound.",
    everyday: "Oxygen makes up about 21% of Earth's air. Many living things use it in cellular respiration to release energy from food.",
    source: "https://periodic-table.rsc.org/element/8/oxygen"
  },
  NITROGEN: {
    name: "Nitrogen", formula: "N₂", kind: "Elemental molecule", state: "Gas at room temperature",
    bonding: "Two nitrogen atoms share three pairs of electrons in a strong triple bond. This elemental molecule is relatively unreactive under ordinary conditions.",
    everyday: "Nitrogen makes up about 78% of Earth's air. It is used as a protective atmosphere in some food packaging.",
    source: "https://periodic-table.rsc.org/element/7/nitrogen"
  }
};
