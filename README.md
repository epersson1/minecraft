# RPG Server Utilities

This repository contains a toolset used to run 1TruLovr's RPG minecraft server, based on the MythicMobs plugin for making custom items.

Here is the rundown of how the project is structured, how the data flows, and where the "magic" (aka questionable regex) happens.

## The Architecture 

The core problem this project solves is getting complex YAML configurations into a lightweight, static web interface (GitHub Pages) without running a backend server.

**Data Flow:**
`ExampleItems.yml` (Written by 1TruLovr) ➝ `yaml_to_csv.py` (Parse YAML file) ➝ `items_parsed.csv` (Organized CSV) ➝ `Web App` (Client-side javascript)

1.  **User Input:** We maintain items in the standard MythicMobs YAML format. TODO: This formatting has changed from `ExampleItems.yml` to the current minecraft version, seen in `itemTemplates.yml`.  The parser needs to be updated to consider all possible item combinations and the new lore tags.
2.  **Parse YAML:** We run `yaml_to_csv.py` to flatten that hierarchical YAML into a structured CSV.
3.  **Frontend:** The web tools (`randomizer` and `item-creator`) fetch and parse that CSV client-side to do their thing.

*Why CSV?* Because I don't know how to parse a YAML file in HTML. Obviously removing this python step, or making it run automatically in the browser, would be much more convenient.

## Project Structure

```text
/
├── ExampleItems.yml           # The raw MythicMobs configuration file.
├── yaml_to_csv.py             # The build script. Parses YAML -> CSV.
├── items_parsed_v2.csv        # The output data file used by the web apps.
│
├── randomizer/                # The Loot Gen Tool
│   ├── index.html
│   └── randomizer.js          # Logic for filtering & scaling stats.
│
└── item-creator/              # The Item Builder Tool
    ├── index.html
    └── item_creator.js        # Logic for generating YAML snippets.
```

## Key Code Components
1. The Parser (`yaml_to_csv.py`)
This is the heavy lifter. It extracts metadata hidden in the item's "Lore" attribute.

**Lore Parsing:** The script scans the Lore list for lines starting with &9 and brackets []. It uses rules to determine Class, Supertype (e.g., Sword), Subtype, and Modifiers. Check `parse_lore()` if you need to change how tags are detected.

**Stats Extraction:** It flattens nested YAML attributes (like Attributes.MainHand.Damage) into CSV columns (MainHand_Damage).

2. The Randomizer (`randomizer/randomizer.js`)
Uses PapaParse to read `items_parsed_v2.csv` into memory on load. Then, builds sets for Rarity/Class/Type based on what it finds in the CSV. The `scaleItem(item, level)` function applies a flat multiplier (currently 10% per level) to stats.

TODO: Update `scaleItem` once 1TruLovr provides actual scaling logic. May need to be more complex than a linear scale...

3. The Item Creator (`item-creator/`)
This is mostly a form-to-template engine. It loads items_parsed.csv just to populate the "Templates" dropdown, letting you clone an existing item to start. It exports valid YAML snippets that can be pasted back into the main server config.

## Development Notes
The Python script uses PyYAML. The frontend uses PapaParse (via CDN).

Since we are serverless, `items_parsed_v2.csv` acts as our database. If you add a new column in the Python script, make sure the JS knows to look for it!

The parser assumes specific color codes (e.g., &9 for lore tags). That has changed, e.g. for rarity, which I'm working on in `new_yaml_parser.py`, but it hasn't been tested.