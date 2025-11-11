import yaml
import os
import pandas as pd
import numpy as np

# Set up list of attributes
attr = ["Armor", 
        "ArmorToughness", 
        "KnockbackResistance", 
        "Health",
        "AttackSpeed",
        "MovementSpeed",
        "AttackSpeed",
        "Damage",
        "Luck"]
attr.sort()
attr_part = ["MainHand", "OffHand", "Head", "Chest", "Legs", "Feet"]
all_attrs = [a + "_" + b for a in attr_part for b in attr]
empty_attrs = dict(zip(all_attrs, [np.nan] * len(all_attrs)))

def parse_attributes(attributes):
    # Flatten the Attributes dict, e.g. Attributes -> MainHand -> Damage: +98
    flat_attrs = empty_attrs.copy()
    if not attributes:
        return flat_attrs
    for hand_or_part, vals in attributes.items():
        for k, v in vals.items():
            flat_attrs[f"{hand_or_part}_{k}"] = v
    return flat_attrs

def parse_enchantments(enchantments):
    # enchantments is a list of strings of the form 'ENCHANTMENT:val'
    if not enchantments:
        return None
    result = {}
    for entry in enchantments:
        if isinstance(entry, str):
            name, val = entry.split(":")
            result[name] = val
    return result

def main():
    # Load in the yml file
    with open("ExampleItems - Copy.yml", "r") as f:
        data = yaml.safe_load(f)

    rows = []
    
    # Iterate over items in the file
    for item_name, item_data in data.items():
        row = {"ItemName": item_name}
        # Basic fields
        row["Id"] = item_data.get("Id")
        row["Data"] = item_data.get("Data", None)

        # Display and Lore (join lore lines into a single string with newlines)
        row["Display"] = item_data.get("Display")
        lore = item_data.get("Lore", [])
        if lore:
            row["Lore"] = "\n".join(lore)
        else:
            row["Lore"] = None

        # Enchantments as a list, then join as "Enchant:Level" strings
        enchants = parse_enchantments(item_data.get("Enchantments"))
        if enchants:
            row["Enchantments"] = "\n".join(f"{k}:{v}" for k,v in enchants.items())
        else:
            row["Enchantments"] = None

        # Attributes flattened
        attrs = parse_attributes(item_data.get("Attributes"))
        row.update(attrs)

        # Options - flatten boolean options if present
        options = item_data.get("Options")
        if options:
            for k, v in options.items():
                row[f"Option_{k}"] = v

        rows.append(row)

    df = pd.DataFrame(rows)

    # Example: save to CSV
    df.to_csv("items_parsed.csv", index=False)


main()