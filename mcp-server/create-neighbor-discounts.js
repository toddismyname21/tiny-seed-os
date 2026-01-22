#!/usr/bin/env node
/**
 * CREATE NEIGHBOR DISCOUNT CODES
 *
 * Run this script directly to create the direct mail campaign discounts:
 * - NEIGHBOR-VEG-FULL: $30 off Veggie CSA ($600+)
 * - NEIGHBOR-VEG-HALF: $15 off Veggie CSA ($300+)
 * - NEIGHBOR-FLORAL: $20 off Floral CSA
 * - NEIGHBOR: $15 off (base code for all CSA)
 *
 * Usage:
 *   node create-neighbor-discounts.js           # Create discounts
 *   node create-neighbor-discounts.js --dry-run # Preview without creating
 *   node create-neighbor-discounts.js --list    # List existing discounts
 */

const { createNeighborDiscounts, listDiscountCodes, getProducts } = require('./shopify-discount');

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const listOnly = args.includes('--list');
  const showProducts = args.includes('--products');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  TINY SEED FARM - NEIGHBOR DISCOUNT CODE CREATOR');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (listOnly) {
    console.log('📋 Listing existing discount codes...\n');
    const result = await listDiscountCodes();
    if (result.success) {
      if (result.discounts.length === 0) {
        console.log('No discount codes found.');
      } else {
        for (const discount of result.discounts) {
          console.log(`\n📌 ${discount.priceRule.title}`);
          console.log(`   ID: ${discount.priceRule.id}`);
          console.log(`   Value: ${discount.priceRule.value_type === 'fixed_amount' ? '$' : ''}${Math.abs(parseFloat(discount.priceRule.value))}${discount.priceRule.value_type === 'percentage' ? '%' : ''} off`);
          console.log(`   Starts: ${discount.priceRule.starts_at}`);
          console.log(`   Ends: ${discount.priceRule.ends_at || 'Never'}`);
          console.log(`   Codes: ${discount.codes.map(c => c.code).join(', ') || 'None'}`);
        }
      }
    } else {
      console.log('❌ Error:', result.error);
    }
    return;
  }

  if (showProducts) {
    console.log('📦 Fetching products...\n');
    const result = await getProducts();
    if (result.success) {
      const csaProducts = result.products.filter(p => {
        const t = p.title.toLowerCase();
        return t.includes('csa') || t.includes('share') || t.includes('subscription');
      });

      console.log(`Found ${csaProducts.length} CSA products:\n`);
      for (const p of csaProducts) {
        const price = p.variants?.[0]?.price || 'N/A';
        console.log(`  - ${p.title} ($${price}) [ID: ${p.id}]`);
      }
    } else {
      console.log('❌ Error:', result.error);
    }
    return;
  }

  if (dryRun) {
    console.log('🔍 DRY RUN - Preview mode (no changes will be made)\n');
  } else {
    console.log('🚀 CREATING DISCOUNT CODES\n');
  }

  console.log('Creating NEIGHBOR campaign discounts:');
  console.log('  • NEIGHBOR-VEG-FULL: $30 off Veggie CSA ($600+ minimum)');
  console.log('  • NEIGHBOR-VEG-HALF: $15 off Veggie CSA ($300+ minimum)');
  console.log('  • NEIGHBOR-FLORAL: $20 off Floral CSA');
  console.log('  • NEIGHBOR: $15 off (base code for all CSA)\n');

  const result = await createNeighborDiscounts({
    endsAt: '2026-03-31T23:59:59-05:00',
    dryRun
  });

  if (result.dryRun) {
    console.log('📋 PREVIEW - Would create:\n');
    for (const item of result.wouldCreate) {
      console.log(`  ✓ ${item.code}: ${item.discount} (min: ${item.minPurchase}, ${item.products} products)`);
    }
    if (result.products && result.products.length > 0) {
      console.log('\n📦 CSA Products found:');
      for (const p of result.products) {
        console.log(`  - ${p.title} ($${p.price})`);
      }
    }
    console.log('\n💡 Run without --dry-run to create these discounts.');
  } else if (result.success) {
    console.log('✅ SUCCESS! Created discount codes:\n');
    for (const item of result.created) {
      console.log(`  ✓ ${item.code}`);
      console.log(`    Discount: ${item.discount}`);
      console.log(`    Min Purchase: ${item.minPurchase || 'None'}`);
      console.log(`    Products: ${item.products}`);
      console.log(`    Price Rule ID: ${item.priceRuleId}\n`);
    }
    if (result.errors.length > 0) {
      console.log('⚠️  Some codes had errors:');
      for (const err of result.errors) {
        console.log(`  ✗ ${err.code}: ${err.error}`);
      }
    }
  } else {
    console.log('❌ FAILED:', result.error);
    if (result.errors && result.errors.length > 0) {
      for (const err of result.errors) {
        console.log(`  ✗ ${err.code}: ${err.error}`);
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
