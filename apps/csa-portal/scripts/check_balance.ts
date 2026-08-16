import { getCustomerGidByEmail, getStoreCreditBalance } from '../src/lib/shopify';
const email = process.argv[2];
const gid = await getCustomerGidByEmail(email!);
if (!gid) { console.log('no shopify customer for', email); process.exit(0); }
const bal = await getStoreCreditBalance(gid);
console.log(email, 'store credit balance: $' + bal.toFixed(2));
