// Turns one TheMealDB recipe into our data (TEAM-PLAN.md §3, feature 1):
// cuisine names, ingredient names, amounts, allergens and diet tags.
// No network and no database here, so the import scripts and the Playwright
// test (tests/themealdb.spec.ts) run exactly the same code.

// What TheMealDB's API returns for one recipe (only the fields we use).
export type MealDbMeal = {
  idMeal: string;
  strMeal: string;
  strCategory: string | null;
  strArea: string | null;
  strCountry?: string | null;
  strInstructions: string | null;
  strMealThumb: string | null;
  strSource: string | null;
  [key: `strIngredient${number}` | `strMeasure${number}`]: string | null | undefined;
};

export const ALLERGIES = ["Milk", "Eggs", "Fish", "Shellfish", "Tree nuts", "Peanuts", "Wheat", "Soy", "Sesame"] as const;
export type Allergen = (typeof ALLERGIES)[number];

// What an ingredient means for the diet tags. "animal" is honey and the like:
// fine for vegetarians, not for vegans. "plant?" may hide an animal product
// (bread can have milk), so the recipe isn't tagged vegan. "unsure" means we
// can't tell if it's vegetarian (plain "stock"), so the recipe is flagged.
export type DietClass = "meat" | "fish" | "dairy" | "egg" | "animal" | "plant" | "plant?" | "unsure";

export type IngredientInfo = {
  name: string;
  category: string;
  isStaple: boolean;
  allergens: Allergen[];
  // Allergens it may contain. The recipe is tagged with them (the safe side)
  // and flagged for a person to check.
  maybeAllergens: Allergen[];
  diet: DietClass;
};

// ---------------------------------------------------------------------------
// Cuisine: TheMealDB gives a country ("France"); Browse uses cuisines ("French").
// ---------------------------------------------------------------------------

const CARIBBEAN = ["Antigua and Barbuda", "Aruba", "Bahamas", "Barbados", "Cayman Islands", "Dominica"];
const CUISINES: Record<string, string> = {
  Afghanistan: "Afghan", Albania: "Albanian", Algeria: "Algerian", Andorra: "Andorran",
  Angola: "Angolan", Argentina: "Argentinian", Armenia: "Armenian", Australia: "Australian",
  Austria: "Austrian", Azerbaijan: "Azerbaijani", Bangladesh: "Bangladeshi", Belgium: "Belgian",
  Botswana: "Botswanan", Brazil: "Brazilian", Bulgaria: "Bulgarian", Cambodia: "Cambodian",
  Canada: "Canadian", Chile: "Chilean", China: "Chinese", Colombia: "Colombian",
  "Costa Rica": "Costa Rican", Croatia: "Croatian", Cuba: "Cuban", Denmark: "Danish",
  Egypt: "Egyptian", Estonia: "Estonian", France: "French", Greece: "Greek", India: "Indian",
  Ireland: "Irish", Italy: "Italian", Jamaica: "Jamaican", Japan: "Japanese", Kenya: "Kenyan",
  Laos: "Laotian", Malaysia: "Malaysian", Mexico: "Mexican", Morocco: "Moroccan",
  Netherlands: "Dutch", Norway: "Norwegian", Philippines: "Filipino", Poland: "Polish",
  Portugal: "Portuguese", Russia: "Russian", "Saudi Arabia": "Saudi Arabian", Slovakia: "Slovak",
  Spain: "Spanish", Syria: "Syrian", Thailand: "Thai", Tunisia: "Tunisian", Turkey: "Turkish",
  Ukraine: "Ukrainian", "United Kingdom": "British", "United States": "American",
  Uruguay: "Uruguayan", Venezuela: "Venezuelan", Vietnam: "Vietnamese",
  ...Object.fromEntries(CARIBBEAN.map((c) => [c, "Caribbean"])),
};
// TheMealDB's "area" uses some cuisine names already, and some country names.
const AREA_NAMES: Record<string, string> = {
  Argentina: "Argentinian", France: "French", India: "Indian", Netherlands: "Dutch",
  Norway: "Norwegian", Slovakia: "Slovak", "United States": "American", Venezuela: "Venezuelan",
};
// Mistakes in TheMealDB's data, by recipe id.
const CUISINE_FIXES: Record<string, string> = { "53251": "Turkish" }; // lahmacun is listed as Vietnam

export function cuisineOf(meal: Pick<MealDbMeal, "idMeal" | "strArea" | "strCountry">): string | null {
  if (CUISINE_FIXES[meal.idMeal]) return CUISINE_FIXES[meal.idMeal];
  if (meal.strCountry && CUISINES[meal.strCountry]) return CUISINES[meal.strCountry];
  if (meal.strArea) return AREA_NAMES[meal.strArea] ?? meal.strArea;
  return null;
}

// ---------------------------------------------------------------------------
// Amounts: "1 ½ cups" → 1.5 cups, "400g" → 400 g, "To taste" → no amount.
// ---------------------------------------------------------------------------

const UNICODE_FRACTIONS: Record<string, string> = {
  "½": " 1/2", "¼": " 1/4", "¾": " 3/4", "⅓": " 1/3", "⅔": " 2/3", "⅛": " 1/8",
};
const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, half: 0.5, quarter: 0.25,
};
// Each unit we keep, with the words TheMealDB uses for it.
const UNITS: [string, string[]][] = [
  ["tsp", ["tsp", "tsps", "teaspoon", "teaspoons", "tspn", "t"]],
  ["tbsp", ["tbsp", "tbsps", "tbs", "tbls", "tblsp", "tblsps", "tablespoon", "tablespoons", "tbl", "tbsb", "t"]],
  ["cup", ["cup", "cups", "c"]],
  ["g", ["g", "gr", "gram", "grams", "gms"]],
  ["kg", ["kg", "kgs", "kilo", "kilos", "kilogram", "kilograms"]],
  ["ml", ["ml", "mls", "millilitre", "millilitres", "milliliter", "milliliters"]],
  ["l", ["l", "litre", "litres", "liter", "liters", "ltr"]],
  ["oz", ["oz", "ounce", "ounces"]],
  ["fl oz", ["floz", "fl oz", "fl. oz", "fluid ounces"]],
  ["lb", ["lb", "lbs", "pound", "pounds"]],
  ["pint", ["pint", "pints"]],
  ["cloves", ["clove", "cloves"]],
  ["can", ["can", "cans", "tin", "tins"]],
  ["jar", ["jar", "jars"]],
  ["package", ["package", "packages", "packet", "packets", "pack", "packs", "pkg"]],
  ["slices", ["slice", "slices"]],
  ["pieces", ["piece", "pieces", "pcs"]],
  ["stalks", ["stalk", "stalks"]],
  ["sticks", ["stick", "sticks"]],
  ["sprigs", ["sprig", "sprigs"]],
  ["leaves", ["leaf", "leaves"]],
  ["bunch", ["bunch", "bunches"]],
  ["handful", ["handful", "handfuls"]],
  ["sheets", ["sheet", "sheets"]],
  ["fillets", ["fillet", "fillets"]],
  ["cm", ["cm"]],
  ["inch", ["inch", "inches"]],
  ["head", ["head", "heads"]],
  ["knob", ["knob", "knobs"]],
  ["drops", ["drop", "drops"]],
  ["dash", ["dash", "dashes"]],
  ["pinch", ["pinch", "pinches"]],
];
const UNIT_WORDS = new Map<string, string>();
for (const [unit, words] of UNITS) for (const w of words) if (!UNIT_WORDS.has(w)) UNIT_WORDS.set(w, unit);
// "1 T" is a tablespoon in American recipes; lowercase "1 t" is a teaspoon.
UNIT_WORDS.set("t", "tsp");

// Words that describe the ingredient, not the amount ("2 large", "1 chopped").
const DESCRIPTORS = new Set(
  ("large small medium big whole chopped finely roughly sliced diced minced grated crushed " +
    "peeled halved beaten fresh freshly thinly thickly cubed shredded ground mashed melted " +
    "softened cooked boiled raw dried frozen ripe trimmed quartered torn rinsed drained " +
    "deseeded seeded pitted skinned boneless skinless lean thick thin heaped level rounded " +
    "generous good-sized of x").split(" "),
);
// Measures that mean "no fixed amount": a garnish or "to taste".
const NO_AMOUNT = /^(to taste|to serve|to garnish|to glaze|garnish|for frying|for greasing|for brushing|for dusting|for serving|for the|as needed|as required|optional|sprinkl|spinkl|drizzle|splash|some|few|top|dusting|spray|season|a little|little|enough|steamed|boiled|shaved|melted)/;

// "extra" marks a garnish or "to taste": it may have no amount, and Single
// Dish treats it as optional. Any other ingredient without an amount is a
// problem the import reports.
export type Amount = { quantity: number | null; unit: string | null; extra?: boolean };

function readNumber(text: string): [number, string] | null {
  // "1 1/2", "1/2", "1.5", "1,5", "2-3" (keeps the first number)
  const m = text.match(/^(\d+)\s+(\d+)\/(\d+)|^(\d+)\/(\d+)|^(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  let value: number;
  if (m[1]) value = Number(m[1]) + Number(m[2]) / Number(m[3]);
  else if (m[4]) value = Number(m[4]) / Number(m[5]);
  else value = Number(m[6].replace(",", "."));
  let rest = text.slice(m[0].length).trim();
  rest = rest.replace(/^(?:-|–|to|or)\s*\d+(?:[.,/]\d+)?\s*/, ""); // range: keep the first number
  return value > 0 && Number.isFinite(value) ? [value, rest] : null;
}

export function parseMeasure(measure: string | null | undefined): Amount {
  let text = (measure ?? "").toLowerCase().trim();
  for (const [f, s] of Object.entries(UNICODE_FRACTIONS)) text = text.replaceAll(f, s);
  text = text
    .replace(/\(.*?\)/g, " ") // "1 can (400g)" → "1 can"
    .replace(/^(the )?(juice|zest)((\/| and )(juice|zest))? of\s+/, "") // "juice/zest of one" → "one"
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return { quantity: null, unit: null };
  if (NO_AMOUNT.test(text)) return { quantity: null, unit: null, extra: true };
  if (/^(pinch|dash)/.test(text)) {
    return { quantity: null, unit: text.startsWith("pinch") ? "pinch" : "dash", extra: true };
  }

  const first = text.split(" ")[0];
  if (NUMBER_WORDS[first] !== undefined && !/^\d/.test(text)) {
    text = `${NUMBER_WORDS[first]} ${text.slice(first.length).trim()}`;
  }
  const read = readNumber(text);
  if (!read) {
    // A unit with no number ("Handful", "Bunch") means one of it.
    const unit = UNIT_WORDS.get(first);
    if (unit && !["pinch", "dash"].includes(unit)) return { quantity: 1, unit };
    return { quantity: null, unit: null };
  }
  const [quantity, rest] = read;

  // "2 x 400g tins": two times 400 g.
  const times = rest.match(/^x\s*(\d+(?:[.,]\d+)?)\s*([a-z]+)/);
  if (times && ["g", "ml", "kg", "l", "oz"].includes(UNIT_WORDS.get(times[2]) ?? "")) {
    return tidy(quantity * Number(times[1].replace(",", ".")), UNIT_WORDS.get(times[2])!);
  }

  // The unit can be glued to the number ("400g") or follow it ("400 g").
  const words = rest.replace(/^([a-z.]+)\/.*/, "$1").split(/[\s,]+/).filter(Boolean);
  for (const [i, word] of words.entries()) {
    const clean = word.replace(/\.$/, "");
    const two = `${clean} ${words[i + 1] ?? ""}`.trim();
    if (UNIT_WORDS.has(two)) return tidy(quantity, UNIT_WORDS.get(two)!);
    if (UNIT_WORDS.has(clean)) {
      // A capital "T" (tablespoon) was lowercased: look at the original.
      if (clean === "t" && /\dT\b|\d\s+T\b/.test(measure ?? "")) return tidy(quantity, "tbsp");
      return tidy(quantity, UNIT_WORDS.get(clean)!);
    }
    if (!DESCRIPTORS.has(clean)) break; // "2 lemons": the rest is the ingredient
  }
  return { quantity: round(quantity), unit: null };
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

// Writes units the way the rest of the app does ("1 cup", "2 cups").
function tidy(quantity: number, unit: string): Amount {
  const q = round(quantity);
  if (unit === "cup" && q > 1) return { quantity: q, unit: "cups" };
  if (unit === "l") return { quantity: round(q * 1000), unit: "ml" };
  return { quantity: q, unit };
}

// ---------------------------------------------------------------------------
// Ingredients: our name, category, allergens and diet class.
// ---------------------------------------------------------------------------

// TheMealDB name (lowercase) → our name. British names become the US names
// the app already uses, so "aubergine" and "eggplant" are one ingredient.
const RENAME: Record<string, string> = {
  "all purpose flour": "all-purpose flour", "plain flour": "all-purpose flour", flour: "all-purpose flour",
  aubergine: "eggplant", "egg plants": "eggplant", "baby aubergine": "eggplant",
  courgettes: "zucchini", "coriander leaves": "cilantro", "cilantro leaves": "cilantro",
  "garlic clove": "garlic", "garlic bulb": "garlic", "minced garlic": "garlic", "garlic granules": "garlic powder",
  "spring onions": "green onions", scallions: "green onions", "chopped onion": "onion", onions: "onion",
  "red onions": "red onion", challots: "shallots", carrots: "carrot", "chicken breasts": "chicken breast",
  "chicken stock": "chicken broth", "vegetable stock": "vegetable broth", "beef stock": "beef broth",
  "hot beef stock": "beef broth", "unsalted beef stock": "beef broth", "beef stock cubes": "beef stock cube",
  "minced beef": "ground beef", "lean minced beef": "ground beef", "lean minced steak": "ground beef",
  "minced pork": "ground pork", "lamb mince": "ground lamb", "turkey mince": "ground turkey",
  "double cream": "heavy cream", "whipping cream": "heavy cream", "single cream": "light cream",
  "caster sugar": "sugar", "golden caster sugar": "sugar", "granulated sugar": "sugar",
  "dark brown sugar": "brown sugar", "muscovado sugar": "brown sugar", "icing sugar": "powdered sugar",
  "chopped tomatoes": "canned diced tomatoes", "tinned tomatos": "canned diced tomatoes",
  "canned tomatoes": "canned diced tomatoes", "diced tomatoes": "canned diced tomatoes",
  // In British recipes, "tomato purée" is the thick paste.
  "tomato puree": "tomato paste", "tomato purée": "tomato paste", passata: "tomato puree",
  tomato: "tomatoes", "beef tomatoes": "tomatoes", "vine tomatoes": "tomatoes",
  "grape tomatoes": "cherry tomatoes", "baby plum tomatoes": "cherry tomatoes",
  "red pepper": "red bell pepper", "sweet red peppers": "red bell pepper", "green pepper": "green bell pepper",
  "yellow pepper": "yellow bell pepper", "mixed peppers": "bell pepper", "roasted pepper": "roasted red peppers",
  pepper: "black pepper", "ground black pepper": "black pepper", "whole black peppercorns": "black pepper",
  peppercorns: "black pepper", chilli: "red chili", "red chilli": "red chili", "green chilli": "green chilies",
  "birds-eye chillies": "bird's eye chilies", "dried chillies": "dried red chilies", "dried red chillies": "dried red chilies",
  "ancho chillies": "dried ancho chilies", "chilli flakes": "red pepper flakes", "red chilli flakes": "red pepper flakes",
  "chilli powder": "chili powder", "red chilli powder": "chili powder", "hot chilli powder": "chili powder",
  "scotch bonnet": "Scotch bonnet pepper", "basil leaves": "fresh basil", basil: "fresh basil",
  mint: "fresh mint", "hot mint": "fresh mint", dill: "fresh dill", rosemary: "fresh rosemary", sage: "fresh sage",
  "chopped parsley": "parsley", "freshly chopped parsley": "parsley", "chopped chive": "chives",
  "tarragon leaves": "fresh tarragon", oregano: "dried oregano", marjoram: "dried marjoram",
  egg: "eggs", "free-range egg, beaten": "eggs", "egg white": "egg whites",
  feta: "feta cheese", "cubed feta cheese": "feta cheese", mozzarella: "mozzarella cheese",
  "mozzarella balls": "mozzarella cheese", parmesan: "parmesan cheese", "parmigiano-reggiano": "parmesan cheese",
  gruyere: "Gruyère cheese", "gruyère": "Gruyère cheese", "gruyere cheese": "Gruyère cheese",
  "mature cheddar": "cheddar cheese", "goats cheese": "goat cheese", "stilton cheese": "Stilton cheese",
  "natural yoghurt": "plain yogurt", yogurt: "plain yogurt", "full fat yogurt": "plain yogurt",
  "strained yoghurt": "Greek yogurt", "greek yogurt": "Greek yogurt", "semi-skimmed milk": "milk",
  "whole milk": "milk", "salted butter": "butter", "unsalted butter": "butter", "melted butter": "butter",
  "full fat sour cream": "sour cream", "shredded mexican cheese": "shredded cheese",
  "shredded monterey jack cheese": "Monterey Jack cheese", "monterey jack cheese": "Monterey Jack cheese",
  "colby jack cheese": "Colby Jack cheese", "swiss cheese": "Swiss cheese", "gouda cheese": "Gouda cheese",
  "extra virgin olive oil": "olive oil", "sunflower oil": "vegetable oil", "rapeseed oil": "vegetable oil",
  "canola oil": "vegetable oil", oil: "vegetable oil", "high heat cooking oil": "vegetable oil",
  "ground nut oil": "peanut oil", "sesame seed oil": "sesame oil",
  "kosher salt": "salt", "sea salt": "salt", "coarse salt": "salt",
  "cumin seeds": "cumin seeds", cinnamon: "ground cinnamon", nutmeg: "ground nutmeg",
  "turmeric powder": "turmeric", "ground turmeric": "turmeric", "ground cardomom": "ground cardamom",
  cardamom: "ground cardamom", clove: "whole cloves", cloves: "whole cloves", "ground clove": "ground cloves",
  "smoky paprika": "smoked paprika", "hot smoked paprika": "smoked paprika", "sweet smoked paprika": "smoked paprika",
  "bicarbonate of soda": "baking soda", "corn flour": "cornstarch", starch: "cornstarch",
  jalapeno: "jalapeño", "jumbo shrimp": "shrimp", prawns: "shrimp", "king prawns": "shrimp",
  "raw king prawns": "shrimp", "raw tiger prawns": "shrimp", "tiger prawns": "shrimp", "raw frozen prawns": "shrimp",
  "baby squid": "squid", "crab meay": "crab meat", conchs: "conch",
  "bok choi": "bok choy", "pak choi": "bok choy", "baby pak koi": "bok choy", "chinese leaf": "napa cabbage",
  "chinese cabbage": "napa cabbage", "white cabbage": "cabbage", "hispi (sweetheart) cabbage": "pointed cabbage",
  sweetcorn: "corn", "frozen peas": "peas", "petit pois": "peas", rocket: "arugula", swede: "rutabaga",
  beetroot: "beets", "cooked beetroot": "beets", lemons: "lemon", "lime leaves": "kaffir lime leaves",
  "makrut lime leaves": "kaffir lime leaves", "lemongrass stalks": "lemongrass", "chestnut mushroom": "cremini mushrooms",
  "floury potatoes": "potatoes", "russet potato": "potatoes", "red potatoes": "potatoes", "small potatoes": "potatoes",
  "new potatoes": "potatoes", "baby new potatoes": "potatoes", "jersey royal potatoes": "potatoes",
  "charlotte potatoes": "potatoes", rice: "white rice", "glutinous rice": "sticky rice",
  "linguine pasta": "linguine", "bowtie pasta": "farfalle", "penne rigate": "penne", macaroni: "elbow macaroni",
  "vermicelli rice noodles": "rice noodles", "rice vermicelli": "rice noodles", "rice stick noodles": "rice noodles",
  "flat rice noodles": "rice noodles", "brown rice noodle": "rice noodles", "naan bread": "naan",
  "white bread": "bread", "stale bread": "bread", toast: "bread", "wholegrain bread": "bread",
  "bread rolls": "bread rolls", bun: "bread rolls", "sesame seed burger buns": "sesame burger buns",
  "tahini paste": "tahini", "sesame seed": "sesame seeds", "roasted peanut": "peanuts", "unsalted peanuts": "peanuts",
  "cashew nuts": "cashews", "shelled hazelnuts": "hazelnuts", "cooked chestnut": "chestnuts",
  "tobasco sauce": "hot sauce", "tabasco sauce": "hot sauce", hotsauce: "hot sauce", "tomato ketchup": "ketchup",
  "barbeque sauce": "barbecue sauce", "clear honey": "honey", "thai fish sauce": "fish sauce",
  "cider vinegar": "apple cider vinegar", "dry white wine": "white wine", "dry sherry": "sherry",
  "sweet sherry": "sherry", "rice wine": "Shaoxing wine", "shaoxing wine": "Shaoxing wine", "cooking wine": "Shaoxing wine",
  "thai red curry paste": "red curry paste", "thai green curry paste": "green curry paste",
  "dried white beans": "white beans", "great northern beans": "white beans", "haricot beans": "white beans",
  "dried white navy beans": "white beans", "can of chickpeas": "chickpeas", "lima beans": "butter beans",
  "soya bean": "soybeans", "french lentils": "green lentils", "green red lentils": "lentils",
  "instant yeast": "yeast", "fast action yeast": "yeast", "boiling water": "water", "warm water": "water",
  "cold water": "water", "strong white bread flour": "bread flour", "strong wholemeal flour": "whole wheat flour",
  "whole wheat": "whole wheat flour", "semolina flour": "semolina", "fine yellow cornmeal": "cornmeal",
  "white cornmeal": "cornmeal", "marinated tofu": "tofu", "jamón ibérico": "serrano ham", "parma ham": "prosciutto",
  "deli ham": "ham", "smoked ham": "ham", "streaky bacon": "bacon", "bacon lardon": "bacon",
  "polish kabanos": "kabanos sausages", "pork belly slices": "pork belly", "pork shoulder steaks": "pork shoulder",
  "sirloin steak tips": "sirloin steak", "skirty steak": "skirt steak", "beef flank steak": "flank steak",
  "fillet of steak": "beef tenderloin", "beef fillet": "beef tenderloin", "iceberg lettuce": "lettuce",
  "little gem lettuce": "lettuce", "baby lettuce leaves": "lettuce", "white fish": "white fish fillets",
  "fish fillet": "white fish fillets", salmon: "salmon fillet", "sea bass fillets": "sea bass",
  "rainbow trout": "trout", "codfish bulljaw": "salt cod", "harissa spice": "harissa", "seasoned rice vinegar": "rice vinegar",
  "dijon mustard": "Dijon mustard", "english mustard": "English mustard", "worcestershire sauce": "Worcestershire sauce",
  "chinese five spice powder": "Chinese five spice", "five spice powder": "Chinese five spice",
  "italian seasoning": "Italian seasoning", "jamaican curry powder": "Jamaican curry powder",
  "sichuan pepper": "Sichuan pepper", "szechuan peppercorns": "Sichuan pepper", "chinese broccoli": "Chinese broccoli",
  "chinese long beans": "Chinese long beans", "chinese sesame sauce": "Chinese sesame paste",
  "italian fennel sausages": "Italian sausages", "german sausages": "German sausages", "cuban bread": "Cuban bread",
  "bramley apples": "apples", "savoy cabbage": "Savoy cabbage", "jerusalem artichokes": "Jerusalem artichokes",
  "serrano ham": "serrano ham", "sazon goya with azafran": "sazón seasoning", sazon: "sazón seasoning",
  "salsa lizano": "Lizano sauce", "sirop de liège": "Liège syrup", "kampot pepper": "black pepper",
  "madras paste": "Madras curry paste", "massaman curry paste": "Massaman curry paste",
  "panang curry paste": "Panang curry paste", "emmentaler cheese": "Emmental cheese",
  "västerbottensost cheese": "Västerbottensost cheese", "egg yolks": "egg yolks",
  "ready rolled shortcrust pastry": "shortcrust pastry", "phyllo dough": "filo pastry",
  "red pepper sauce": "red pepper sauce", "beef stock concentrate": "beef stock cube", "bouillon cubes": "stock cubes",
  "chicken bouillon powder": "chicken stock cube", "frogs legs": "frog legs",
};

// Names whose meaning depends on the amount: "1 tsp coriander" is the
// ground spice, "a handful of coriander" is the fresh herb.
function renameByAmount(name: string, measure: string): string | null {
  const spoon = /\b(tsp|teaspoon|tbsp|tbs|tablespoon|tblsp|pinch)/i.test(measure) && !/chopped|leaves|fresh|handful|bunch|sprig/i.test(measure);
  if (name === "coriander") return spoon || /ground/i.test(measure) ? "ground coriander" : "cilantro";
  if (name === "ginger") return /ground/i.test(measure) ? "ground ginger" : "fresh ginger";
  if (name === "cumin") return /seed/i.test(measure) ? "cumin seeds" : "ground cumin";
  if (name === "thyme") return /fresh|sprig|leaves|bunch|handful/i.test(measure) || !spoon ? "fresh thyme" : "dried thyme";
  return null;
}

export function ourName(mealDbName: string, measure = ""): string {
  const key = mealDbName.trim().toLowerCase().replace(/\s+/g, " ");
  return renameByAmount(key, measure) ?? RENAME[key] ?? key;
}

// Rules are checked in order; the first match wins. Each rule gives the
// category, the diet class and the allergens ("?" = may contain).
type Rule = [RegExp, string, DietClass, string?];
const RULES: Rule[] = [
  // Not animal products, even though their names look like one.
  [/^(coconut|coconut milk|coconut cream|unsweetened coconut milk|desiccated coconut|coconut oil)$/, "pantry", "plant"],
  [/^soya milk$/, "dairy", "plant", "Soy"],
  [/^almond milk$/, "dairy", "plant", "Tree nuts"],
  [/^(peanut butter|peanuts|peanut oil)$/, "pantry", "plant", "Peanuts"],
  [/^vegan butter$/, "dairy", "plant", "?Soy"],
  [/^flax eggs$/, "pantry", "plant"],

  // Fish and shellfish (pescatarian is fine, vegetarian isn't).
  [/(shrimp|prawn|lobster|crab|clam|mussel|oyster|conch|squid|calamari|octopus|scallop)/, "protein", "fish", "Shellfish"],
  [/^(anchovy fillet|barramundi|cod|haddock|smoked haddock|hake|herring|mackerel|monkfish|pilchards|trout|red snapper|salmon fillet|hot smoked flaked salmon|smoked salmon|salt cod|sardines|sea bass|tuna|white fish fillets)$/, "protein", "fish", "Fish"],
  [/^(fish sauce|fish stock|prahok)$/, "pantry", "fish", "Fish"],
  [/^Worcestershire sauce$/i, "pantry", "fish", "Fish"], // has anchovies
  [/^(seafood stock|frozen seafood mix)$/, "pantry", "fish", "Shellfish,?Fish"],
  // Thai curry pastes often have shrimp paste in them, but not always.
  [/^(red|green|Massaman|Panang) curry paste$/i, "pantry", "unsure", "?Shellfish,?Fish"],

  // Meat.
  [/(chicken|turkey|duck|goose|beef|steak|lamb|pork|veal|goat|oxtail|bacon|ham$|prosciutto|chorizo|sausage|kabanos|kielbasa|salami|pancetta|black pudding|morcilla|corned|doner|shredded meat|chuck roast|hind shank|brisket|trotters|frog legs|lard|suet|meat)/, "protein", "meat"],

  // Dairy.
  [/(cheese|parmesan|paneer|ricotta|mascarpone|feta|brie|manchego|pecorino|queso|cheese curds)/, "dairy", "dairy", "Milk"],
  [/^(milk|heavy cream|light cream|cream|sour cream|clotted cream|creme fraiche|fromage frais|plain yogurt|Greek yogurt|butter|ghee|buttermilk|evaporated milk|sweetened condensed milk|soured cream and chive dip)$/i, "dairy", "dairy", "Milk"],

  // Eggs.
  [/^(eggs|egg yolks|egg whites|egg wash)$/, "protein", "egg", "Eggs"],
  [/^(mayonnaise|smoky aïoli)$/, "pantry", "egg", "Eggs"],
];

// The full table of ingredients, written by hand, for everything the rules
// above don't settle. Each entry: [category, diet, allergens].
const TABLE: Record<string, [string, DietClass, string?]> = {};
function add(category: string, diet: DietClass, allergens: string | undefined, names: string) {
  for (const name of names.split(";").map((n) => n.trim()).filter(Boolean)) TABLE[name] = [category, diet, allergens];
}
// Staples: assumed to be in every kitchen, ignored by Single Dish.
add("staple", "plant", undefined,
  "salt; black pepper; white pepper; olive oil; vegetable oil; water; allspice; allspice berries; ground allspice; " +
  "baking powder; baking soda; cayenne pepper; chili powder; curry powder; Jamaican curry powder; garam masala; " +
  "garlic powder; onion powder; onion salt; celery salt; ground cardamom; ground cinnamon; cinnamon stick; " +
  "ground cloves; whole cloves; ground coriander; coriander seeds; ground cumin; cumin seeds; ground ginger; " +
  "ground nutmeg; turmeric; paprika; smoked paprika; red pepper flakes; dried oregano; dried thyme; " +
  "dried marjoram; dried mint; dried dill; Italian seasoning; fennel seeds; fenugreek; caraway seed; " +
  "mustard seeds; mustard powder; ground mustard; saffron; star anise; sumac; ras el hanout; Chinese five spice; " +
  "Sichuan pepper; bay leaf; bay leaves; juniper berries; ground mahleb; ground annatto; achiote seeds; " +
  "pul biber; kabse spice; biryani masala; all-purpose seasoning; seasoning; cajun; jerk; fajita seasoning; " +
  "sazón seasoning; dried leaves of summer savoury; summer savoury; poppy seeds; vanilla extract; vanilla; " +
  "vanilla pod; vanilla sugar; almond essence; ground onion; cardamom; khus khus");
add("staple", "dairy", "Milk", "butter");
// Fresh produce.
add("vegetable", "plant", undefined,
  "onion; red onion; garlic; shallots; green onions; leek; carrot; celery; celeriac; potatoes; sweet potatoes; " +
  "eggplant; zucchini; tomatoes; cherry tomatoes; plum tomatoes; bell pepper; red bell pepper; green bell pepper; " +
  "yellow bell pepper; roasted red peppers; red chili; green chilies; bird's eye chilies; jalapeño; " +
  "Scotch bonnet pepper; habanero pepper; banana pepper; romano pepper; padron peppers; sweet peppadew peppers; " +
  "cabbage; red cabbage; Savoy cabbage; napa cabbage; pointed cabbage; cabbage leaves; bok choy; broccoli; " +
  "purple sprouting broccoli; Chinese broccoli; cauliflower; spinach; kale; lettuce; arugula; cucumber; " +
  "mushrooms; cremini mushrooms; shiitake mushrooms; oyster mushrooms; wild mushrooms; wood ear mushrooms; " +
  "green beans; runner beans; Chinese long beans; snow peas; sugar snap peas; peas; corn; corn on the cob; " +
  "asparagus; white asparagus; fennel; fennel bulb; beets; radish; daikon radish; turnips; rutabaga; parsnips; " +
  "pumpkin; squash; butternut squash; zapallo squash; avocado; bean sprouts; mung bean sprouts; bamboo shoot; " +
  "water chestnut; artichoke; Jerusalem artichokes; okra; cassava; yuca; cassaba; taro; white yam; yautia; " +
  "breadfruit; plantain; green papaya; callaloo; morning glory; mulukhiyah; palm hearts; ackee; vegetables; " +
  "raw vegetables; stir-fry vegetables; roasted vegetables; sauerkraut; white sauerkraut; dill pickles; " +
  "pickled garlics; pickled scallion heads; pickled scallion head brine; vine leaves; pickled grape leaves; dried sorrel; wild garlic leaves; " +
  "creamed corn; pumpkin puree; sun-dried tomatoes");
add("fruit", "plant", undefined,
  "lemon; lemon juice; lemon zest; lime; lime juice; orange; orange juice; orange zest; apples; apple; banana; " +
  "mango; pineapple chunks; pineapple juice; pomegranate; grapefruit; apricot; dried apricots; prunes; raisins; " +
  "light raisins; cranberry; cherry; blackberries; raspberries; strawberries; longan; fried ripe bananas; " +
  "tamarind paste; tamarind ball");
add("herb", "plant", undefined,
  "parsley; cilantro; fresh basil; fresh mint; fresh dill; fresh thyme; fresh rosemary; fresh sage; fresh tarragon; " +
  "chives; fresh ginger; galangal; lemongrass; kaffir lime leaves; Thai basil; pandan leaves; banana leaves; " +
  "bouquet garni; horseradish");
// Beans and lentils.
add("legume", "plant", undefined,
  "chickpeas; black beans; kidney beans; cannellini beans; white beans; borlotti beans; pinto beans; " +
  "butter beans; broad beans; black eyed peas; yellow split peas; lentils; brown lentils; green lentils; " +
  "toor dal; canned beans; refried beans; baked beans; dried white corn");
add("legume", "plant", "Soy", "soybeans; fermented soybeans; tofu; silken tofu; tempeh; fermented black beans");
// Grains and breads.
add("grain", "plant", undefined,
  "white rice; basmati rice; jasmine rice; brown rice; paella rice; sushi rice; sticky rice; rice noodles; " +
  "rice paper sheets; rice flour; sticky rice flour; rice flour pancakes; quinoa; cornmeal; grits; " +
  "yellow masarepa; masarepa; corn tortillas; hard taco shells; oats; ground oats; buckwheat; buckwheat flour; " +
  "cassava flour; casabe; chickpea flour; potato starch; tapioca; cornstarch; mixed grain; rye; rye grain; " +
  "rye flour; fries");
add("grain", "dairy", "Milk", "corn arepa filled with mozarella cheese");
add("grain", "plant", "Wheat",
  "all-purpose flour; bread flour; whole wheat flour; self-raising flour; semolina; couscous; bulgur wheat; " +
  "freekeh; wheat berries; spaghetti; linguine; penne; rigatoni; farfalle; paccheri pasta; elbow macaroni; " +
  "vermicelli pasta; udon noodles; breadcrumbs; filo pastry; flour tortilla; tempura flour; whole wheat; " +
  "pretzels");
add("grain", "plant?", "Wheat",
  "bread; crusty bread; baguette; ciabatta; pita bread; bread rolls; Cuban bread; english muffins; rye bread; " +
  "wholegrain bread");
add("grain", "plant?", "Wheat,?Milk", "naan; white bread mix; shortcrust pastry; puff pastry");
add("grain", "plant?", "Wheat,Sesame", "sesame burger buns");
add("grain", "plant?", "Wheat,?Eggs", "lasagne sheets; fettuccine; wonton skin");
add("grain", "egg", "Wheat,Eggs", "egg noodles; egg roll wrappers; egg rolls; cannelloni tubes");
add("grain", "plant?", "?Wheat,?Eggs", "noodles");
add("grain", "plant?", "?Wheat", "tortillas");
add("grain", "plant", "?Wheat", "farine"); // in the Caribbean, "farine" is cassava flour
// Nuts and seeds.
add("pantry", "plant", "Tree nuts",
  "almonds; cashews; walnuts; pistachio; pine nuts; hazelnuts; chestnuts; ground almonds");
add("pantry", "plant", "Sesame", "sesame seeds; tahini; hummus; Chinese sesame paste");
add("pantry", "plant", "Sesame", "sesame oil");
// Sauces and other pantry items.
add("pantry", "plant", undefined,
  "sugar; brown sugar; powdered sugar; palm sugar; coco sugar; molasses; black treacle; maple syrup; " +
  "sugar syrup; Liège syrup; ginger cordial; rose water; cacao; cocoa; yeast; " +
  "tomato paste; tomato puree; canned diced tomatoes; tomato sauce; ketchup; passata; " +
  "vinegar; white vinegar; white wine vinegar; red wine vinegar; rice vinegar; sherry vinegar; balsamic vinegar; " +
  "apple cider vinegar; malt vinegar; vegan white wine vinegar; pickle juice; " +
  "white wine; red wine; sherry; brandy; beer; dark beer; stout; cider; sake; mirin; Shaoxing wine; soda water; " +
  "Dijon mustard; English mustard; mustard; wholegrain mustard; capers; black olives; green olives; " +
  "pitted black olives; pimento stuffed olives; kalamata olives; hot sauce; sriracha; chilli sauce; " +
  "sweet chilli sauce; thai chilli jam; plum sauce; duck sauce; harissa; red pepper paste; red pepper sauce; " +
  "salsa; green salsa; pico de gallo sauce; chimichurri sauce; enchilada sauce; achiote paste; alinos sauce; " +
  "Lizano sauce; galangal paste; ginger paste; ginger garlic paste; pomegranate molasses; vegetable broth; " +
  "vegetable stock cube; dried red chilies; dried ancho chilies; dried apricots; apricot jam; sorrel jam; " +
  "mung bean paste; truffle oil; shortening; vinaigrette dressing; barbecue sauce; Madras curry paste; liquid smoke");
add("pantry", "plant", "Soy,Wheat", "soy sauce; dark soy sauce; teriyaki sauce");
add("pantry", "plant", "Soy,?Wheat,?Sesame", "hoisin sauce");
add("pantry", "plant", "Soy,Wheat", "gochujang");
add("pantry", "plant", "?Soy,?Wheat", "chilli bean paste; doubanjiang");
add("pantry", "fish", "Shellfish", "oyster sauce; shrimp paste; dried shrimp; shrimp stock");
add("pantry", "plant", "?Wheat,?Sesame", "falafel");
add("pantry", "unsure", "?Eggs,?Milk", "garlic sauce");
add("pantry", "unsure", "?Wheat", "stock cubes"); // could be meat or vegetable stock
add("pantry", "meat", "?Wheat", "beef gravy");
add("pantry", "meat", undefined, "chicken broth; beef broth; lamb stock; chicken stock cube; beef stock cube; gelatine");
add("pantry", "unsure", "?Tree nuts,?Wheat", "mincemeat"); // sweet mincemeat can have suet
add("pantry", "animal", undefined, "honey");
add("dairy", "dairy", "Milk", "goat cheese"); // not goat meat
add("pantry", "dairy", "Milk", "liquid cheese");

export function ingredientInfo(name: string): IngredientInfo | null {
  let row: [string, DietClass, string?] | undefined = TABLE[name];
  if (!row) {
    const rule = RULES.find(([re]) => re.test(name));
    if (rule && rule[1]) row = [rule[1], rule[2], rule[3]];
  }
  if (!row) return null;
  const [category, diet, list = ""] = row;
  const tags = list.split(",").filter(Boolean);
  return {
    name,
    category,
    isStaple: category === "staple",
    allergens: tags.filter((t) => !t.startsWith("?")) as Allergen[],
    maybeAllergens: tags.filter((t) => t.startsWith("?")).map((t) => t.slice(1)) as Allergen[],
    diet,
  };
}

// ---------------------------------------------------------------------------
// One recipe.
// ---------------------------------------------------------------------------

export type ConvertedIngredient = [quantity: number | null, unit: string | null, name: string];

export type ConvertedMeal = {
  themealdb_id: string;
  title: string;
  category: string | null;
  cuisine: string | null;
  ingredients: ConvertedIngredient[];
  allergens: Allergen[];
  diet_tags: string[];
  // Why a person must check this recipe before it's loaded.
  flags: string[];
  // Things the import couldn't do on its own (unknown ingredients, missing amounts).
  problems: string[];
  source_url: string | null;
  image_url: string | null;
  original_instructions: string;
};

// A recipe's allergens and diet tags, from its ingredients. Used again by
// build.mts when the agent corrects an ingredient name.
export function tagsFor(infos: IngredientInfo[]): { allergens: Allergen[]; diet_tags: string[]; flags: string[] } {
  const flags: string[] = [];
  // Allergens: sure ones, plus possible ones on the safe side (and flagged).
  const allergens = new Set<Allergen>();
  for (const info of infos) {
    for (const a of info.allergens) allergens.add(a);
    for (const a of info.maybeAllergens) {
      if (!info.allergens.includes(a)) flags.push(`"${info.name}" may contain ${a}`);
      allergens.add(a);
    }
  }

  // Diet tags, the same way the library is tagged: vegan recipes are also
  // vegetarian; recipes with fish but no meat are pescatarian.
  const classes = new Set(infos.map((i) => i.diet));
  const diet_tags: string[] = [];
  if (classes.has("unsure") && !classes.has("meat")) {
    for (const info of infos.filter((i) => i.diet === "unsure")) {
      flags.push(`"${info.name}" may contain meat`);
    }
  } else if (!classes.has("meat") && !classes.has("unsure")) {
    if (classes.has("fish")) diet_tags.push("pescatarian");
    else {
      const vegan = [...classes].every((c) => c === "plant");
      diet_tags.push(...(vegan ? ["vegan", "vegetarian"] : ["vegetarian"]));
    }
  }
  return { allergens: ALLERGIES.filter((a) => allergens.has(a)), diet_tags, flags: [...new Set(flags)] };
}

// Garnishes and extras may have no amount; anything else needs one, or
// Single Dish would treat it as optional (TEAM-PLAN.md §3).
const EXTRA_CATEGORIES = new Set(["staple", "herb"]);

export function convertMeal(meal: MealDbMeal): ConvertedMeal {
  const problems: string[] = [];
  const flags: string[] = [];
  const merged = new Map<string, ConvertedIngredient>();
  const extras = new Set<string>();
  const infos: IngredientInfo[] = [];

  for (let i = 1; i <= 20; i++) {
    const raw = meal[`strIngredient${i}`]?.trim();
    if (!raw) continue;
    const measure = meal[`strMeasure${i}`]?.trim() ?? "";
    const name = ourName(raw, measure);
    const info = ingredientInfo(name);
    if (!info) problems.push(`no category for "${name}" (TheMealDB: "${raw}")`);
    else infos.push(info);
    const amount = parseMeasure(measure);
    if (amount.extra) extras.add(name.toLowerCase());

    // The same ingredient listed twice is merged; amounts add up when the
    // units match ("1 onion" + "1 onion"), otherwise the first is kept.
    const key = name.toLowerCase();
    const seen = merged.get(key);
    if (!seen) {
      merged.set(key, [amount.quantity, amount.unit, name]);
    } else if (seen[0] !== null && amount.quantity !== null && seen[1] === amount.unit) {
      seen[0] = round(seen[0] + amount.quantity);
    } else if (seen[0] === null && amount.quantity !== null) {
      seen[0] = amount.quantity;
      seen[1] = amount.unit;
    }
  }

  const ingredients = [...merged.values()];
  for (const [quantity, , name] of ingredients) {
    const info = ingredientInfo(name);
    if (quantity === null && info && !EXTRA_CATEGORIES.has(info.category) && !extras.has(name.toLowerCase())) {
      problems.push(`"${name}" has no amount`);
    }
  }

  const tags = tagsFor(infos);
  return {
    themealdb_id: meal.idMeal,
    title: meal.strMeal.trim().replace(/\s+/g, " "),
    category: meal.strCategory,
    cuisine: cuisineOf(meal),
    ingredients,
    ...tags,
    flags: [...new Set([...flags, ...tags.flags])],
    problems,
    source_url: meal.strSource?.trim() || null,
    image_url: meal.strMealThumb?.trim() || null,
    original_instructions: (meal.strInstructions ?? "").trim(),
  };
}
