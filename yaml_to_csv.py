import yaml
import csv
import re

# --- Configuration ---

SOURCE_YAML = 'ExampleItems - Copy.yml'
OUTPUT_CSV = 'items_parsed_v2.csv' # New output file

RARITY_MAP = {
    '&2': 'Common',
    '&1': 'Uncommon',
    '&5': 'Rare',
    '&b': 'Unique',
    '&6': 'Legendary',
}

# Define all known slots and stats from the item_creator.js
# This ensures a consistent CSV header
SLOTS = ["MainHand", "OffHand", "Head", "Chest", "Legs", "Feet"]
STATS = [
    "Armor", "ArmorToughness", "KnockbackResistance", "Health", 
    "AttackSpeed", "MovementSpeed", "Damage", "Luck"
]

# --- Helper Functions ---

def parse_rarity(display_name):
    """
    Parses the Display name string (e.g., '&b&lDefender of Faith')
    and returns the corresponding rarity.
    """
    if not isinstance(display_name, str):
        return 'Unknown'
    
    # Find all color codes (e.g., &b, &l, &5)
    codes = re.findall(r'&\w', display_name)
    
    for code in codes:
        if code in RARITY_MAP:
            return RARITY_MAP[code]
            
    return 'Unknown' # Default if no matching code is found

def parse_lore(lore_str):
    """
    Parses the Lore string to extract Class, Supertype, Subtype,
    and Modifiers based on the bracketed tags.
    """
    if not isinstance(lore_str, str):
        return None, None, None, []

    lore_class = None
    supertype = None
    subtype = None
    modifiers = []
    
    tags = []
    # Find all bracketed tags, assuming they are on lines starting with '&9['
    # This is based on the CSV data provided
    for line in lore_str.split('\n'):
        line_stripped = line.strip()
        # Find lines like '&9[Angelic]' or '&9[Melee, Sword]'
        if line_stripped.startswith('&9[') and line_stripped.endswith(']'):
            tag_content = line_stripped[3:-1] # Get content inside [ ]
            tags.append(tag_content)
            
    if not tags:
        return None, None, None, []
        
    tag0 = tags[0]
    has_comma_0 = ',' in tag0
    has_number_0 = any(char.isdigit() for char in tag0)
    
    type_tag_found_at = -1 # Index of the type tag, if found

    if not has_comma_0 and not has_number_0:
        # Rule: First tag is Class if simple and has no numbers
        # e.g., [Angelic]
        lore_class = tag0
        
        # Check if tag1 is the type
        if len(tags) > 1:
            tag1 = tags[1]
            if ',' in tag1:
                # e.g., [Melee, Sword]
                parts = [p.strip() for p in tag1.split(',')]
                supertype = parts[0]
                subtype = parts[1] if len(parts) > 1 else None
                type_tag_found_at = 1
            # else: tag1 is a modifier, will be caught later
            
    elif has_comma_0:
        # Rule: First tag is Type if it has a comma
        # e.g., [Melee, Sword]
        parts = [p.strip() for p in tag0.split(',')]
        supertype = parts[0]
        subtype = parts[1] if len(parts) > 1 else None
        type_tag_found_at = 0
    
    # else: Tag0 is a modifier (e.g., [1 Removal])
    
    # Collect all other tags as modifiers
    start_index = 0
    if lore_class:
        start_index = 1
    if type_tag_found_at != -1:
        start_index = max(start_index, type_tag_found_at + 1)
    
    for i in range(len(tags)):
        # Skip tags we've already processed as Class or Type
        if lore_class and i == 0:
            continue
        if type_tag_found_at == i:
            continue
            
        modifiers.append(tags[i])

    return lore_class, supertype, subtype, modifiers

def main():
    """
    Main function to read YAML, process data, and write to CSV.
    """
    print(f"Loading YAML from '{SOURCE_YAML}'...")
    try:
        with open(SOURCE_YAML, 'r', encoding='utf-8') as f:
            items = yaml.safe_load(f)
    except FileNotFoundError:
        print(f"ERROR: '{SOURCE_YAML}' not found. Please place it in the same directory.")
        return
    except Exception as e:
        print(f"ERROR: Could not read YAML file. {e}")
        return

    if not items:
        print("YAML file is empty or invalid.")
        return

    # --- Define CSV Headers ---
    base_headers = ['ItemName', 'Id', 'Data', 'Display', 'Lore', 'Enchantments']
    
    # Our new parsed columns
    parsed_headers = ['Rarity', 'Class', 'Supertype', 'Subtype', 'Modifiers']
    
    # All stat headers
    stat_headers = [f"{slot}_{stat}" for slot in SLOTS for stat in STATS]
    
    # Option headers (from item_creator.js)
    option_headers = ['Option_Unbreakable', 'Option_Color']
    
    all_headers = base_headers + parsed_headers + stat_headers + option_headers

    # --- Process Data ---
    processed_data = []
    for item_name, data in items.items():
        if not data:
            print(f"Skipping empty item: {item_name}")
            continue

        row = {'ItemName': item_name}

        # 1. Basic Fields
        row['Id'] = data.get('Id')
        row['Data'] = data.get('Data')
        display_name = data.get('Display')
        row['Display'] = display_name
        
        # Handle Lore/Enchantments (lists in YAML, multiline string in CSV)
        lore_list = data.get('Lore', [])
        lore_str = '\n'.join(lore_list) if isinstance(lore_list, list) else lore_list
        row['Lore'] = lore_str
        
        ench_list = data.get('Enchantments', [])
        print(ench_list)
        ench_str = '\n'.join(ench_list) if isinstance(ench_list, list) else ench_list
        row['Enchantments'] = ench_str

        # 2. NEW Parsed Fields
        row['Rarity'] = parse_rarity(display_name)
        lore_class, supertype, subtype, modifiers = parse_lore(lore_str)
        row['Class'] = lore_class
        row['Supertype'] = supertype
        row['Subtype'] = subtype
        row['Modifiers'] = '|'.join(modifiers) # Join modifiers with a pipe

        # 3. Stats Fields (Attributes)
        attributes = data.get('Attributes', {})
        if attributes:
            for slot, stats in attributes.items():
                if slot in SLOTS and isinstance(stats, dict):
                    for stat, value in stats.items():
                        if stat in STATS:
                            row[f"{slot}_{stat}"] = value

        # 4. Options Fields
        options = data.get('Options', {})
        if options:
            row['Option_Unbreakable'] = options.get('Unbreakable')
            row['Option_Color'] = options.get('Color')

        processed_data.append(row)

    # --- Write to CSV ---
    print(f"Writing {len(processed_data)} items to '{OUTPUT_CSV}'...")
    try:
        with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=all_headers, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(processed_data)
    except Exception as e:
        print(f"ERROR: Could not write to CSV file. {e}")
        return

    print("---")
    print("Processing complete!")
    print(f"New file created: '{OUTPUT_CSV}'")
if __name__ == "__main__":
    main()