/**
 * Generates human-friendly session codes like SUNFLOWER-42 (word + number).
 */

const WORDS = [
  'SUNFLOWER', 'MOUNTAIN', 'RIVERBED', 'STARFISH', 'BUTTERFLY',
  'LIGHTHOUSE', 'MEADOW', 'THUNDER', 'RAINBOW', 'SPARKLE',
  'HORIZON', 'CRYSTAL', 'VELVET', 'MIRROR', 'CANOPY',
  'WILDFLOWER', 'CASCADE', 'EMBER', 'SUMMIT', 'GROVE',
];

export function generateSessionCode(): string {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${word}-${num}`;
}
