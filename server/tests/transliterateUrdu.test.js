import assert from 'node:assert/strict';
import { transliterateUrdu } from '../src/utils/transliterateUrdu.js';

console.log('--- Running transliterateUrdu Unit Tests ---');

// Test 1: Empty and Null-safe values
assert.equal(transliterateUrdu(''), '', 'Empty string should return empty string');
assert.equal(transliterateUrdu(null), '', 'Null should return empty string');
assert.equal(transliterateUrdu(undefined), '', 'Undefined should return empty string');
assert.equal(transliterateUrdu('   '), '', 'Whitespace should return empty string');
console.log('✓ Test 1: Null and empty handling passed');

// Test 2: Already Latin / English text preservation
assert.equal(
  transliterateUrdu('Hadith 1: The reward of deeds depends on intentions.'),
  'Hadith 1: The reward of deeds depends on intentions.',
  'English text should be preserved intact'
);
console.log('✓ Test 2: Latin text preservation passed');

// Test 3: Islamic Honorifics conversion
const honorificTest = 'رسول اللہ صلی اللہ علیہ وسلم نے فرمایا';
const honorificResult = transliterateUrdu(honorificTest);
assert(
  honorificResult.includes('(Sallallahu Alaihi Wasallam)'),
  `Honorific should contain (Sallallahu Alaihi Wasallam), got: "${honorificResult}"`
);
assert(
  honorificResult.includes('Rasool') || honorificResult.includes('Allah'),
  `Honorific sentence should contain Rasool Allah, got: "${honorificResult}"`
);
console.log('✓ Test 3: Islamic honorifics conversion passed');

// Test 4: Aspirated consonants (Do-chashmi he: بھ، پھ، تھ، ٹھ، کھ، گھ)
const aspiratedTest = 'بھائی نے کھانا کھایا اور گھر گیا';
const aspiratedResult = transliterateUrdu(aspiratedTest);
assert(
  aspiratedResult.toLowerCase().includes('bh') &&
  aspiratedResult.toLowerCase().includes('kh') &&
  aspiratedResult.toLowerCase().includes('gh'),
  `Aspirated consonants bh, kh, gh should be present, got: "${aspiratedResult}"`
);
console.log('✓ Test 4: Aspirated consonants passed');

// Test 5: Hadith 1 Famous Opening Phrase
const hadith1Urdu = 'آپ صلی اللہ علیہ وسلم فرما رہے تھے کہ تمام اعمال کا دارومدار نیت پر ہے اور ہر عمل کا نتیجہ ہر انسان کو اس کی نیت کے مطابق ہی ملے گا ۔';
const hadith1Roman = transliterateUrdu(hadith1Urdu);
assert(
  hadith1Roman.includes('daromadar') &&
  hadith1Roman.includes('niyyat') &&
  hadith1Roman.includes('amal'),
  `Hadith 1 must have key words daromadar, niyyat, amal. Got: "${hadith1Roman}"`
);
console.log('✓ Test 5: Hadith 1 Opening transliteration passed:', hadith1Roman.slice(0, 80) + '...');

// Test 6: Eastern Arabic numerals and punctuation
const numberTest = 'حدیث نمبر ۱: سچ بولو ۔';
const numberResult = transliterateUrdu(numberTest);
assert(
  numberResult.includes('1') && numberResult.includes('.'),
  `Numbers and punctuation should be normalized. Got: "${numberResult}"`
);
console.log('✓ Test 6: Numerals & punctuation normalization passed');

// Test 7: Caching verification
const start = performance.now();
transliterateUrdu(hadith1Urdu); // cache hit
const duration = performance.now() - start;
assert(duration < 2, `Cached transliteration should execute instantly (<2ms), took ${duration.toFixed(3)}ms`);
console.log(`✓ Test 7: Cache performance passed (${duration.toFixed(3)}ms)`);

console.log('--- ALL transliterateUrdu Unit Tests Passed Successfully! ---');
