import yaml
import csv
import re

# Input/Output files
SOURCE_YAML = 'itemTemplates.yml'
OUTPUT_CSV = 'items_parsed_v2.csv'

# Mapping of color codes to rarities
RARITY_MAP = {
    '&2': 'Uncommon',
    '&1': 'Rare',
    '&5': 'Epic',
    '&b': 'Unique',
    '&d': 'Exotic',
    '&6': 'Legendary'
}

# Slots where an item can provide attributes.
SLOTS = ["MainHand", "OffHand", "Head", "Chest", "Legs", "Feet", "All"]

# Possible stats
STATS = [
    "Armor", "ArmorToughness", "KnockbackResistance", "Health", 
    "AttackSpeed", "MovementSpeed", "Damage", "Luck", "EntityInteractionRange"
]

# Custom stats from Mythic Mobs
CUSTOM_STATS = [
    "CRITICAL_STRIKE_CHANCE", "CRITICAL_STRIKE_DAMAGE", "CRITICAL_STRIKE_RESILIENCE",
    "DODGE_CHANCE", "DODGE_NEGATION", "PARRY_CHANCE", "PARRY_COUNTERATTACK",
    "PARRY_POWER", "PARRY_NEGATION"
]

# Function to read rarity from an item's display name using color code.
def parse_rarity(display_name):
    if not isinstance(display_name, str): return 'Unknown'
    codes = re.findall(r'&\w', display_name)
    for code in codes:
        if code in RARITY_MAP: return RARITY_MAP[code]
    return 'Unknown'

def parse_lore(lore_list):
    """
    Parses the lore attribute:
    1. Potion Effects (&7...) -> Collect list
    2. Flavor Text (&[Code]&o...) -> Collect list
    3. Ability (&9[NAME]) -> Extract
    4. Level (&9[Level N]) -> Extract Number
    5. Class (&9[CLASS]) -> Extract
    6. Type (&9[Type]) -> Extract
    """
    if not lore_list or not isinstance(lore_list, list):
        return [], [], None, None, None, None

    potion_lines = []
    flavor_text_lines = []
    ability = None
    level = None
    item_class = None
    item_type = None

    # Temporary list to hold the &9 tags in order of appearance (Ability -> Class -> Type)
    blue_tags = []

    for line in lore_list:
        # Skip empty lines
        if not line or line.strip() == '':
            continue

        # Potion Effects
        if line.startswith('&7'):
            potion_lines.append(line[2:].strip())
            continue

        # Flavor Text: Looks like "&[AnyColor]&o[Text]"
        # Regex explanation: Starts with &, any single char, then &o, then captures the rest.
        flavor_match = re.match(r'^&.&o(.*)', line)
        if flavor_match:
            flavor_text_lines.append(flavor_match.group(1).strip())
            continue

        # &9 Tags: Ability, Level, Class, Type
        if line.startswith('&9['):
            # Strip the "&9[" start and the "]" end
            content = line[3:-1] 

            # Check specifically for Level
            level_match = re.match(r'Level (\d+)', content)
            if level_match:
                level = level_match.group(1)
            else:
                # If not level, add to our list of tags to process by position later
                blue_tags.append(content)

    # Assign Ability, Class, and Type based on the remaining blue tags.
    # Expected order in lore: Ability -> (Level) -> Class -> Type
    if len(blue_tags) == 3:
        ability = blue_tags[0]
        item_class = blue_tags[1]
        item_type = blue_tags[2]
    elif len(blue_tags) == 2:
        # Assuming Ability is missing: [Class, Type]
        item_class = blue_tags[0]
        item_type = blue_tags[1]
    elif len(blue_tags) == 1:
        # Assume Ability and Class missing: [Type]
        item_type = blue_tags[0]
    
    return potion_lines, flavor_text_lines, ability, level, item_class, item_type


def main():
    try:
        with open(SOURCE_YAML, 'r', encoding='utf-8') as f:
            items = yaml.safe_load(f)
    except FileNotFoundError:
        print(f"Error: Could not find {SOURCE_YAML}")
        return

    # CSV Columns
    base_headers = ['ItemName', 'Id', 'Display', 'Model']
    parsed_headers = ['Rarity', 'Level', 'Class', 'Type', 'Ability', 'PotionEffects', 'FlavorText']
    text_headers = ['Lore', 'Enchantments', 'Skills', 'Hide']
    
    # Attributes (e.g. Mainhand_Damage)
    attr_headers = [f"{slot}_{stat}" for slot in SLOTS for stat in STATS]
    # Custom Stats
    custom_stat_headers = [f"Stat_{s}" for s in CUSTOM_STATS]
    # Options & Trims
    opt_headers = ['Option_Unbreakable', 'Option_SkinTexture', 'Trim_Material', 'Trim_Pattern', 'BannerLayers']
    
    all_headers = base_headers + parsed_headers + text_headers + attr_headers + custom_stat_headers + opt_headers

    processed_data = []
    
    if items:
        for item_name, data in items.items():
            row = {'ItemName': item_name}
            row['Id'] = data.get('Id')
            row['Display'] = data.get('Display')
            row['Model'] = data.get('Model')

            # Parsing Lore
            lore = data.get('Lore', [])
            row['Lore'] = '\n'.join(lore) # Keep raw lore for reference
            row['Rarity'] = parse_rarity(row['Display'])
            
            # Unpack all 6 return values
            potions, flavors, abil, lvl, i_class, i_type = parse_lore(lore)
            
            row['PotionEffects'] = '\n'.join(potions)
            row['FlavorText'] = '\n'.join(flavors)            
            row['Ability'] = abil
            row['Level'] = lvl
            row['Class'] = i_class
            row['Type'] = i_type

            # Enchantments, Skills, "Hide", BannerLayers
            row['Enchantments'] = '\n'.join(data.get('Enchantments', []))
            row['Skills'] = '\n'.join(data.get('Skills', []))
            row['Hide'] = '|'.join(data.get('Hide', []))
            row['BannerLayers'] = '\n'.join(data.get('BannerLayers', []))

            # Attributes
            attributes = data.get('Attributes', {})
            for slot, stats in attributes.items():
                if slot in SLOTS:
                    for stat, value in stats.items():
                        if stat in STATS:
                            row[f"{slot}_{stat}"] = value

            # Custom Stats
            stats_block = data.get('Stats', [])
            for entry in stats_block:
                parts = entry.split()
                if len(parts) >= 2 and parts[0] in CUSTOM_STATS:
                    row[f"Stat_{parts[0]}"] = parts[1]

            # Options and Trims
            options = data.get('Options', {})
            row['Option_Unbreakable'] = options.get('Unbreakable')
            row['Option_SkinTexture'] = options.get('SkinTexture')
            trim = options.get('Trim', {})
            if isinstance(trim, dict):
                row['Trim_Material'] = trim.get('Material')
                row['Trim_Pattern'] = trim.get('Pattern')

            processed_data.append(row)

    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=all_headers, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(processed_data)
    
    print(f"Successfully exported {len(processed_data)} items to {OUTPUT_CSV}")

if __name__ == "__main__":
    main()