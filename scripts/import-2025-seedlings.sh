#!/bin/bash
# Import 2025 Seedling CSV data into SEEDLING_PRODUCTION via API
# Parses the CSV and sends bulkImportSeedlingData request

API_URL="https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec"

# Build JSON payload from parsed CSV data
# Categories and their seeding dates from the CSV headers
cat <<'PAYLOAD' > /tmp/seedling_import_payload.json
{
  "action": "bulkImportSeedlingData",
  "items": [
    {"year":2025,"category":"Cucurbits","crop":"Cucumber","variety":"Cucumber","boughtSeed":"No","seedingDate":"4/18","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Cucurbits","crop":"Zucchini","variety":"Zucchini","boughtSeed":"No","seedingDate":"4/18","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Cucurbits","crop":"Yellow Squash","variety":"Yellow Squash","boughtSeed":"No","seedingDate":"4/18","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Cucurbits","crop":"Pickles","variety":"Pickles","boughtSeed":"No","seedingDate":"4/18","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},

    {"year":2025,"category":"Peppers","crop":"Pepper","variety":"Lunchbox","boughtSeed":"No","seedingDate":"3/1","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Peppers","crop":"Pepper","variety":"Cayenne","boughtSeed":"No","seedingDate":"3/1","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Peppers","crop":"Pepper","variety":"Small Bell Pepper","boughtSeed":"No","seedingDate":"3/1","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Peppers","crop":"Pepper","variety":"Habanero","boughtSeed":"No","seedingDate":"3/1","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Peppers","crop":"Pepper","variety":"Carmen","boughtSeed":"Yes","seedingDate":"3/1","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Peppers","crop":"Pepper","variety":"Banana","boughtSeed":"Yes","seedingDate":"3/1","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Peppers","crop":"Pepper","variety":"Poblano","boughtSeed":"No","seedingDate":"3/1","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Peppers","crop":"Pepper","variety":"Jalapeno","boughtSeed":"Yes","seedingDate":"3/1","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Peppers","crop":"Pepper","variety":"Shishito","boughtSeed":"Yes","seedingDate":"3/1","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Peppers","crop":"Pepper","variety":"Jimmy Nardello","boughtSeed":"Yes","seedingDate":"3/1","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Peppers","crop":"Pepper","variety":"Hot Rod Serrano","boughtSeed":"No","seedingDate":"3/1","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Peppers","crop":"Pepper","variety":"Trinidad Scorpion","boughtSeed":"No","seedingDate":"3/1","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Peppers","crop":"Pepper","variety":"Hungarian Wax","boughtSeed":"No","seedingDate":"3/1","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Peppers","crop":"Pepper","variety":"Ghost","boughtSeed":"No","seedingDate":"3/1","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},

    {"year":2025,"category":"Tomatoes (Heirloom)","crop":"Tomato","variety":"Green Zebra","boughtSeed":"No","seedingDate":"3/20","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":"Heirloom"},
    {"year":2025,"category":"Tomatoes (Heirloom)","crop":"Tomato","variety":"Amish Paste","boughtSeed":"No","seedingDate":"3/20","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":"Heirloom"},
    {"year":2025,"category":"Tomatoes (Heirloom)","crop":"Tomato","variety":"Brandywine","boughtSeed":"No","seedingDate":"3/20","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":"Heirloom"},
    {"year":2025,"category":"Tomatoes (Heirloom)","crop":"Tomato","variety":"San Marzano","boughtSeed":"No","seedingDate":"3/20","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":"Heirloom"},
    {"year":2025,"category":"Tomatoes (Heirloom)","crop":"Tomato","variety":"Striped German","boughtSeed":"No","seedingDate":"3/20","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":"Heirloom"},
    {"year":2025,"category":"Tomatoes (Heirloom)","crop":"Tomato","variety":"Cherokee Purple","boughtSeed":"No","seedingDate":"3/20","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":"Heirloom"},
    {"year":2025,"category":"Tomatoes (Heirloom)","crop":"Tomato","variety":"Roma","boughtSeed":"No","seedingDate":"3/20","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":"Heirloom"},
    {"year":2025,"category":"Tomatoes (Heirloom)","crop":"Tomato","variety":"Big Beef Plus","boughtSeed":"No","seedingDate":"3/20","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":"Heirloom"},

    {"year":2025,"category":"Tomatoes (Determinate)","crop":"Tomato","variety":"Big Beef Plus","boughtSeed":"No","seedingDate":"3/20","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":"Determinate"},
    {"year":2025,"category":"Tomatoes (Determinate)","crop":"Tomato","variety":"Mountain Merit","boughtSeed":"No","seedingDate":"3/20","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":"Determinate"},
    {"year":2025,"category":"Tomatoes (Determinate)","crop":"Tomato","variety":"Mountain Mix (Four Packs)","boughtSeed":"No","seedingDate":"3/20","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":"Determinate, sold in 4-packs"},
    {"year":2025,"category":"Tomatoes (Determinate)","crop":"Tomato","variety":"Candy Bell","boughtSeed":"No","seedingDate":"3/20","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":"Determinate"},
    {"year":2025,"category":"Tomatoes (Determinate)","crop":"Tomato","variety":"Washington Cherry","boughtSeed":"No","seedingDate":"3/20","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":"Determinate"},
    {"year":2025,"category":"Tomatoes (Determinate)","crop":"Tomato","variety":"Gold Nugget Cherry","boughtSeed":"No","seedingDate":"3/20","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":"Determinate"},

    {"year":2025,"category":"Tomatoes (Cherry)","crop":"Tomato","variety":"Supersweet 100","boughtSeed":"No","seedingDate":"3/20","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":"Cherry"},
    {"year":2025,"category":"Tomatoes (Cherry)","crop":"Tomato","variety":"White Cherry","boughtSeed":"No","seedingDate":"3/20","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":"Cherry"},
    {"year":2025,"category":"Tomatoes (Cherry)","crop":"Tomato","variety":"Sungold","boughtSeed":"No","seedingDate":"3/20","numTrays":25,"cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":"Cherry, 25 trays"},
    {"year":2025,"category":"Tomatoes (Cherry)","crop":"Tomato","variety":"Black Cherry","boughtSeed":"No","seedingDate":"3/20","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":"Cherry"},
    {"year":2025,"category":"Tomatoes (Cherry)","crop":"Tomato","variety":"Sunrise Bumble Bee","boughtSeed":"No","seedingDate":"3/20","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":"Cherry"},
    {"year":2025,"category":"Tomatoes (Cherry)","crop":"Tomato","variety":"Juliet Grape","boughtSeed":"No","seedingDate":"3/20","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":"Cherry/Grape"},
    {"year":2025,"category":"Tomatoes (Cherry)","crop":"Tomato","variety":"Blush Grape","boughtSeed":"No","seedingDate":"3/20","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":"Cherry/Grape"},

    {"year":2025,"category":"Eggplant","crop":"Eggplant","variety":"Standard Italian","boughtSeed":"No","seedingDate":"3/1","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Eggplant","crop":"Eggplant","variety":"Fat Italian","boughtSeed":"No","seedingDate":"3/1","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Eggplant","crop":"Eggplant","variety":"Fairy Tale","boughtSeed":"No","seedingDate":"3/1","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},

    {"year":2025,"category":"Celery/Peas/Beans","crop":"Peas","variety":"Peas","boughtSeed":"No","seedingDate":"","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Celery/Peas/Beans","crop":"Celery","variety":"Kelvin Celery","boughtSeed":"No","seedingDate":"","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},

    {"year":2025,"category":"Kale/Chard/Cabbage","crop":"Kale","variety":"Kale/Chard Mix","boughtSeed":"No","seedingDate":"3/15","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Kale/Chard/Cabbage","crop":"Kale","variety":"Winterbor Kale","boughtSeed":"No","seedingDate":"3/15","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Kale/Chard/Cabbage","crop":"Kale","variety":"Russian Mix","boughtSeed":"No","seedingDate":"3/15","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Kale/Chard/Cabbage","crop":"Kale","variety":"Lacinato","boughtSeed":"No","seedingDate":"3/15","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Kale/Chard/Cabbage","crop":"Cabbage","variety":"Cabbage","boughtSeed":"No","seedingDate":"3/15","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Kale/Chard/Cabbage","crop":"Chard","variety":"Chard","boughtSeed":"No","seedingDate":"3/15","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},

    {"year":2025,"category":"Lettuce","crop":"Lettuce","variety":"Mixed Head Lettuce","boughtSeed":"No","seedingDate":"","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Lettuce","crop":"Lettuce","variety":"Mixed Salad Mix","boughtSeed":"No","seedingDate":"","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},

    {"year":2025,"category":"Herbs","crop":"Basil","variety":"Thai Basil (4 packs)","boughtSeed":"No","seedingDate":"","cellPackSize":"4 pack","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Basil","variety":"Thai Basil (4 inch Pots)","boughtSeed":"No","seedingDate":"","cellPackSize":"4in pot","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Basil","variety":"Genovese Basil (4 packs)","boughtSeed":"No","seedingDate":"","cellPackSize":"4 pack","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Basil","variety":"Genovese Basil (4 inch pots)","boughtSeed":"No","seedingDate":"","cellPackSize":"4in pot","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Basil","variety":"Holy Basil","boughtSeed":"No","seedingDate":"","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Basil","variety":"Purple Basil","boughtSeed":"No","seedingDate":"","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Basil","variety":"Lemon Basil","boughtSeed":"No","seedingDate":"","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Mint","variety":"Mint (4 packs)","boughtSeed":"No","seedingDate":"","cellPackSize":"4 pack","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Mint","variety":"Mint (4 inch pots)","boughtSeed":"No","seedingDate":"","cellPackSize":"4in pot","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Herbs","variety":"Mixed Herb","boughtSeed":"No","seedingDate":"","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Herbs","variety":"Simon and Garfunkel Herb","boughtSeed":"No","seedingDate":"","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Chives","variety":"Chives","boughtSeed":"No","seedingDate":"","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Sage","variety":"Sage (4 inch pots)","boughtSeed":"No","seedingDate":"","cellPackSize":"4in pot","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Thyme","variety":"Thyme","boughtSeed":"No","seedingDate":"","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Oregano","variety":"Oregano","boughtSeed":"No","seedingDate":"","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Lavender","variety":"Lavender","boughtSeed":"No","seedingDate":"","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Bee Balm","variety":"Bee Balm","boughtSeed":"No","seedingDate":"","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Lemongrass","variety":"Lemongrass","boughtSeed":"No","seedingDate":"","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Patchouli","variety":"Patchouli","boughtSeed":"No","seedingDate":"","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Catnip","variety":"Catnip","boughtSeed":"No","seedingDate":"","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Lemon Balm","variety":"Lemon Balm","boughtSeed":"No","seedingDate":"","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Parsley","variety":"Parsley","boughtSeed":"No","seedingDate":"","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Parsley","variety":"Curly Parsley","boughtSeed":"No","seedingDate":"","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Tarragon","variety":"French Tarragon","boughtSeed":"No","seedingDate":"","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Tarragon","variety":"Mexican Tarragon","boughtSeed":"No","seedingDate":"","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Dill","variety":"Dill","boughtSeed":"No","seedingDate":"","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Cilantro","variety":"Cilantro","boughtSeed":"No","seedingDate":"","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Bergamot","variety":"Bergamot","boughtSeed":"No","seedingDate":"","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Herbs","crop":"Cat Grass","variety":"Cat Grass","boughtSeed":"No","seedingDate":"","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},

    {"year":2025,"category":"Flowers","crop":"Nasturtium","variety":"Nasturtium","boughtSeed":"No","seedingDate":"","cellPackSize":"4 pack","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Flowers","crop":"Borage","variety":"Borage","boughtSeed":"No","seedingDate":"","cellPackSize":"4 pack","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Flowers","crop":"Strawflower","variety":"Strawflower","boughtSeed":"No","seedingDate":"","cellPackSize":"4 pack","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Flowers","crop":"Celosia","variety":"Celosia","boughtSeed":"No","seedingDate":"","cellPackSize":"4 pack","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Flowers","crop":"Calendula","variety":"Calendula","boughtSeed":"No","seedingDate":"","cellPackSize":"4 pack","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Flowers","crop":"Gomphrena","variety":"Gomphrena","boughtSeed":"No","seedingDate":"","cellPackSize":"4 pack","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Flowers","crop":"Cosmos","variety":"Cosmos","boughtSeed":"No","seedingDate":"","cellPackSize":"4 pack","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Flowers","crop":"Zinnia","variety":"Zinnia","boughtSeed":"No","seedingDate":"","cellPackSize":"4 pack","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Flowers","crop":"Bachelor Buttons","variety":"Bachelor Buttons","boughtSeed":"No","seedingDate":"","cellPackSize":"4 pack","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Flowers","crop":"Sunflower","variety":"Sunflower","boughtSeed":"No","seedingDate":"","cellPackSize":"4 pack","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Flowers","crop":"Dahlia","variety":"Dahlia","boughtSeed":"No","seedingDate":"","cellPackSize":"3in","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},

    {"year":2025,"category":"Mushroom Blocks","crop":"Mushroom","variety":"Mushroom Block","boughtSeed":"No","seedingDate":"4/1","cellPackSize":"block","potsPerTray":1,"priceEach":20,"status":"Planned","notes":"Mushroom growing blocks"},

    {"year":2025,"category":"Misc","crop":"Green Beans","variety":"Green Beans","boughtSeed":"No","seedingDate":"4/20","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""},
    {"year":2025,"category":"Misc","crop":"Snap Peas","variety":"Snap Peas","boughtSeed":"No","seedingDate":"4/20","cellPackSize":"","potsPerTray":18,"priceEach":6,"status":"Planned","notes":""}
  ]
}
PAYLOAD

echo "Payload created with $(grep -c '"year"' /tmp/seedling_import_payload.json) items"
echo ""
echo "Validating JSON..."
if python3 -c "import json; d=json.load(open('/tmp/seedling_import_payload.json')); print(f'Valid JSON: {len(d[\"items\"])} items across categories:'); cats=set(i[\"category\"] for i in d['items']); [print(f'  - {c}: {sum(1 for i in d[\"items\"] if i[\"category\"]==c)}') for c in sorted(cats)]"; then
  echo ""
  echo "JSON is valid. Ready to import."
else
  echo "JSON INVALID - fix before importing"
  exit 1
fi
