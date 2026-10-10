import assert from 'node:assert/strict';
import { fetchHadithsFromApi, VERIFIED_BOOKS } from '../src/services/hadithApiService.js';

console.log('--- Running Hadith API Service Integration Tests ---');

async function runTests() {
  // Test 1: Fetch 2 Hadiths from Sahih Bukhari
  console.log('Fetching Hadiths from Sahih Bukhari...');
  const res1 = await fetchHadithsFromApi({
    book: 'sahih-bukhari',
    paginate: 2,
    page: 1,
  });

  assert(res1 && Array.isArray(res1.hadiths), 'Result must contain an array of hadiths');
  assert.equal(res1.hadiths.length, 2, 'Should return exactly 2 hadiths');
  console.log(`✓ Test 1: Successfully fetched ${res1.hadiths.length} Hadiths`);

  // Test 2: Verify normalized schema
  const h1 = res1.hadiths[0];
  console.log('Sample normalized Hadith #1:');
  console.log({
    id: h1.id,
    hadithNumber: h1.hadithNumber,
    collectionName: h1.collectionName,
    status: h1.status,
    hasArabic: Boolean(h1.arabic),
    hasEnglish: Boolean(h1.english),
    hasUrdu: Boolean(h1.urdu),
    hasRomanUrdu: Boolean(h1.romanUrdu),
  });

  assert(h1.id !== null, 'Hadith ID should not be null');
  assert.equal(h1.hadithNumber, '1', 'First Hadith number should be 1');
  assert(h1.collectionName.includes('Bukhari'), 'Collection name should indicate Bukhari');
  assert.equal(h1.status, 'Sahih', 'Hadith 1 status should be Sahih');
  assert(h1.arabic && h1.arabic.length > 10, 'Arabic text must be present');
  assert(h1.english && h1.english.length > 10, 'English text must be present');
  assert(h1.urdu && h1.urdu.length > 10, 'Urdu text must be present');
  assert(h1.romanUrdu && h1.romanUrdu.length > 10, 'Roman Urdu transliteration must be present');
  assert(h1.romanUrdu.toLowerCase().includes('niyyat'), 'Roman Urdu should contain "niyyat"');
  console.log('✓ Test 2: Normalized object schema verified');

  // Test 3: Pagination metadata
  assert(res1.pagination, 'Pagination metadata must be present');
  assert.equal(res1.pagination.currentPage, 1);
  assert.equal(res1.pagination.perPage, 2);
  assert(res1.pagination.total > 1000, 'Total Bukhari hadiths should be thousands');
  assert.equal(res1.pagination.hasMore, true);
  console.log('✓ Test 3: Pagination metadata verified');

  // Test 4: In-memory cache verification
  const resCached = await fetchHadithsFromApi({
    book: 'sahih-bukhari',
    paginate: 2,
    page: 1,
  });
  assert.equal(resCached.cached, true, 'Subsequent request should be served from in-memory cache');
  console.log('✓ Test 4: In-memory cache hit verified');

  // Test 5: Verify collection list
  assert(VERIFIED_BOOKS.length >= 6, 'Must have at least 6 verified books');
  assert(VERIFIED_BOOKS.some(b => b.slug === 'sahih-bukhari'));
  assert(VERIFIED_BOOKS.some(b => b.slug === 'sahih-muslim'));
  assert(VERIFIED_BOOKS.some(b => b.slug === 'al-tirmidhi'));
  console.log('✓ Test 5: Verified books list confirmed');

  console.log('\n--- ALL Hadith API Service Tests Passed Successfully! ---');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
