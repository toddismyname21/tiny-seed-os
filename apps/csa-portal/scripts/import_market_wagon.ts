import { createClient } from '@supabase/supabase-js';
import { commitWholesaleImport } from '../src/lib/wholesale-import-commit';
const supabase=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
const items:[string,number][]=[
 ['Artisan Head Lettuce Mix',2],
 ['Baby Arugula - 4oz Baby Arugula',1],
 ['Dino Kale (Lacinato Kale)',2],
 ['Fresh Dill Bunch',3],
 ['Green Cabbage Head',1],
 ['Green Sweet Crisp Lettuce',3],
 ['King Spring Salad Greens - 12 oz KING SPRING BIG BAGZ!',2],
 ['King Spring Salad Greens - 4 oz KING SPRING',2],
 ['Little Gem Duo',2],
 ['Organic Beets w/ tops',3],
 ['Organic Broccolini Bunch',19],
 ['Organic Curly Kale',2],
 ['Organic Escarole',2],
 ['Organic Fennel Bulb',3],
 ['Organic Kohlrabi Duo',1],
 ['Organic Parsley',3],
 ['Organic Radicchio',2],
 ['Organic Slicing Cucumbers (3 count)',14],
 ['Romaine Lettuce Head',18],
 ['Summer Squash Medley',3],
];
const lines=items.map(([name,qty])=>({vendor_key:name.toLowerCase(),product_id:null,product_name:name,qty,unit_price_cents:null}));
const res=await commitWholesaleImport(supabase as any,{
  vendor:'market_wagon', vendor_display:'Market Wagon',
  delivery_date:'2026-07-21', external_ref:'332769', lines,
},{onExisting:'replace'});
console.log(JSON.stringify(res,null,2));
