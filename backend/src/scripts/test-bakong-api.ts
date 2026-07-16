/**
 * Test script to verify Bakong API credentials are working.
 *
 * Run: npx ts-node src/scripts/test-bakong-api.ts
 * (Or: npm run ts-node -- src/scripts/test-bakong-api.ts)
 *
 * This will:
 *   1. Try calling Bakong API /v1/generate_qr with your credentials
 *   2. If successful, show the QR data + transaction ID
 *   3. If it fails, show the exact error so we can diagnose
 */
import axios from 'axios';

// ── Load env ──────────────────────────────────────────────────
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_URL = process.env.BAKONG_API_URL || 'https://api-bakong.nbc.gov.kh';
const API_TOKEN = process.env.BAKONG_API_TOKEN || '';
const MERCHANT_ID = process.env.MERCHANT_BAKONG_ID || '';
const MERCHANT_NAME = process.env.MERCHANT_NAME || 'Test Shop';
const MERCHANT_CITY = process.env.MERCHANT_CITY || 'Phnom Penh';

const USD_TO_KHR = 4100;
const TEST_AMOUNT_USD = 0.50;
const TEST_AMOUNT_KHR = Math.round(TEST_AMOUNT_USD * USD_TO_KHR);

async function main() {
  console.log('══════════════════════════════════════════════');
  console.log('  🔬 Bakong API Credential Test');
  console.log('══════════════════════════════════════════════');
  console.log('');
  console.log(`📍 API URL:      ${API_URL}`);
  console.log(`📍 Token:         ${API_TOKEN ? API_TOKEN.substring(0, 20) + '...' : '❌ MISSING'}`);
  console.log(`📍 Merchant ID:   ${MERCHANT_ID || '❌ MISSING'}`);
  console.log(`📍 Merchant Name: ${MERCHANT_NAME}`);
  console.log('');

  // ── Step 1: Validate env vars ──────────────────────────
  const missing: string[] = [];
  if (!API_TOKEN) missing.push('BAKONG_API_TOKEN');
  if (!MERCHANT_ID) missing.push('MERCHANT_BAKONG_ID');

  if (missing.length > 0) {
    console.log('❌ Missing environment variables:');
    missing.forEach(v => console.log(`   - ${v}`));
    console.log('');
    console.log('💡 Set them in backend/.env and try again.');
    process.exit(1);
  }

  // ── Step 2: Test generate QR ───────────────────────────
  console.log('─'.repeat(50));
  console.log('📤 Step 1: Calling POST /v1/generate_qr');
  console.log('─'.repeat(50));
  console.log(`   Amount: ${TEST_AMOUNT_USD} USD (${TEST_AMOUNT_KHR} KHR)`);
  console.log(`   Account: ${MERCHANT_ID}`);
  console.log('');

  const api = axios.create({
    baseURL: API_URL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_TOKEN}`,
    },
  });

  try {
    const start = Date.now();
    const { data } = await api.post('/v1/generate_qr', {
      account_id: MERCHANT_ID,
      merchant_name: MERCHANT_NAME,
      merchant_city: MERCHANT_CITY,
      amount: TEST_AMOUNT_KHR,
      currency: 'KHR',
      description: `Test payment - ${new Date().toISOString()}`,
    });
    const elapsed = Date.now() - start;

    console.log(`✅ SUCCESS! (${elapsed}ms)`);
    console.log('');
    console.log('📦 Response:');
    console.log(JSON.stringify(
      {
        ...data,
        // Truncate the full QR string for display
        qr: data.qr ? data.qr.substring(0, 50) + '...' : '❌ MISSING',
        qr_image: data.qr_image || data.qrImage ? '✅ PRESENT' : '❌ MISSING',
      },
      null,
      2
    ));

    const transactionId = data.transaction_id || data.transactionId || '';
    const qrData = data.qr || '';

    console.log('');
    console.log('✅ Key Values:');
    console.log(`   Transaction ID: ${transactionId}`);
    console.log(`   QR String:      ${qrData ? '✅ Valid' : '❌ Empty'}`);
    console.log(`   QR Image:       ${data.qr_image || data.qrImage ? '✅ Present' : '❌ Missing'}`);

    // ── Step 3: Check the transaction (will likely be pending) ─
    if (transactionId) {
      console.log('');
      console.log('─'.repeat(50));
      console.log('📤 Step 2: Calling POST /v1/check_transaction');
      console.log('─'.repeat(50));
      console.log(`   Transaction ID: ${transactionId}`);
      console.log('');

      try {
        const checkStart = Date.now();
        const { data: checkData } = await api.post('/v1/check_transaction', {
          transaction_id: transactionId,
        });
        const checkElapsed = Date.now() - checkStart;

        console.log(`✅ SUCCESS! (${checkElapsed}ms)`);
        console.log('');
        console.log('📦 Response:');
        console.log(JSON.stringify(checkData, null, 2));
        console.log('');
        console.log(`   Status: ${checkData.status}`);
      } catch (checkErr: any) {
        console.log('⚠️  Check transaction call (expected — no one paid yet):');
        const msg = checkErr?.response?.data?.message || checkErr?.response?.data?.error || checkErr.message;
        console.log(`   ${msg}`);
      }
    }

    console.log('');
    console.log('══════════════════════════════════════════════');
    console.log('  ✅ Bakong API is working correctly!');
    console.log('  🎉 Auto-detection of payments will work.');
    console.log('══════════════════════════════════════════════');
  } catch (err: any) {
    const elapsed = Date.now() - (err as any).config?.__startTime || 0;

    console.log(`❌ FAILED (${elapsed}ms)`);
    console.log('');

    const response = err?.response;
    const status = response?.status;
    const responseData = response?.data;
    const message = responseData?.message || responseData?.error || err.message;

    console.log(`   Status: ${status || 'No response'}`);
    console.log(`   Error:  ${message}`);
    console.log('');

    if (status === 401) {
      console.log('🔑 DIAGNOSIS: 401 Unauthorized');
      console.log('   Your API token is invalid or expired.');
      console.log('');
      console.log('💡 Solutions:');
      console.log('   1. Regenerate your token at the Bakong developer portal');
      console.log('   2. Make sure the token has not expired');
      console.log('   3. Update BAKONG_API_TOKEN in your .env file');
    } else if (status === 400) {
      console.log('🔑 DIAGNOSIS: 400 Bad Request');
      console.log('   The request format might be wrong.');
      console.log('');
      console.log('💡 Check:');
      console.log('   - MERCHANT_BAKONG_ID format (should be something@bkrt)');
      console.log('   - API URL is correct');
      console.log('   - Amount is a positive integer');
    } else if (status === 403) {
      console.log('🔑 DIAGNOSIS: 403 Forbidden');
      console.log('   Token is valid but lacks permission.');
      console.log('   Make sure your Bakong account has merchant API access enabled.');
    } else if (!status) {
      console.log('🔑 DIAGNOSIS: Network Error');
      console.log('   Cannot reach the Bakong API server.');
      console.log('');
      console.log('💡 Check:');
      console.log('   - Is the API URL correct?');
      console.log(`     Current: ${API_URL}`);
      console.log('   - Is your server connected to the internet?');
      console.log('   - Is there a firewall blocking outbound requests?');
    }

    console.log('');
    console.log('📦 Full error details:');
    if (responseData) {
      console.log(JSON.stringify(responseData, null, 2));
    } else {
      console.log(`   ${err.message}`);
    }

    console.log('');
    console.log('══════════════════════════════════════════════');
    console.log('  ❌ Bakong API test FAILED');
    console.log('  ⚠️  System will fall back to SDK/local KHQR');
    console.log('══════════════════════════════════════════════');

    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
