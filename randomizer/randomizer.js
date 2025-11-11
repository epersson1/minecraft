document.addEventListener('DOMContentLoaded', () => {
    const CSV_PATH = '../items_parsed_v2.csv'; 
    
    let allItems = [];
    const raritySet = new Set();
    const classSet = new Set();
    const supertypeSet = new Set();
    const superToSubtypeMap = new Map();

    const SLOTS = ["MainHand", "OffHand", "Head", "Chest", "Legs", "Feet"];
    const STATS = ["Armor", "ArmorToughness", "KnockbackResistance", "Health", "AttackSpeed", "MovementSpeed", "Damage", "Luck"];

    const ENCHANTMENT_MAP = {
        "PROTECTION_ENVIRONMENTAL": "Protection",
        "PROTECTION_FIRE": "Fire Protection",
        "PROTECTION_FALL": "Feather Falling",
        "PROTECTION_EXPLOSIONS": "Blast Protection",
        "PROTECTION_PROJECTILE": "Projectile Protection",
        "OXYGEN": "Respiration",
        "WATER_WORKER": "Aqua Affinity",
        "THORNS": "Thorns",
        "DEPTH_STRIDER": "Depth Strider",
        "FROST_WALKER": "Frost Walker",
        "DAMAGE_ALL": "Sharpness",
        "DAMAGE_UNDEAD": "Smite",
        "DAMAGE_ARTHROPODS": "Bane of Arthropods",
        "KNOCKBACK": "Knockback",
        "FIRE_ASPECT": "Fire Aspect",
        "LOOT_BONUS_MOBS": "Looting",
        "DIG_SPEED": "Efficiency",
        "SILK_TOUCH": "Silk Touch",
        "DURABILITY": "Unbreaking",
        "LOOT_BONUS_BLOCKS": "Fortune",
        "ARROW_DAMAGE": "Power",
        "ARROW_KNOCKBACK": "Punch",
        "ARROW_FIRE": "Flame",
        "ARROW_INFINITE": "Infinity",
        "LUCK": "Luck of the Sea",
        "LURE": "Lure",
        "MENDING": "Mending"
    };

    // --- Filter Elements ---
    const rarityFilter = document.getElementById('rarityFilter');
    const classFilter = document.getElementById('classFilter');
    const supertypeFilter = document.getElementById('supertypeFilter');
    const subtypeFilter = document.getElementById('subtypeFilter');
    const levelInput = document.getElementById('itemLevel');
    const generateBtn = document.getElementById('generateBtn');

    // --- Output Elements ---
    const outputSection = document.getElementById('outputSection');
    const outputCommand = document.getElementById('outputCommand');
    const copyBtn = document.getElementById('copyBtn');
    const previewPane = document.getElementById('previewPane');

    // --- 1. Data Loading and Filter Population ---
    fetch(CSV_PATH)
      .then(response => {
        if (!response.ok) throw new Error('Could not fetch CSV. Make sure "items_parsed_v2.csv" is in the "item-creator" folder.');
        return response.text();
      })
      .then(csvText => {
        const results = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        
        allItems = results.data.filter(r => r.ItemName);
        
        allItems.forEach(item => {
          if (item.Rarity) raritySet.add(item.Rarity);
          if (item.Class) classSet.add(item.Class);
          if (item.Supertype) supertypeSet.add(item.Supertype);
          
          if (item.Supertype && item.Subtype) {
            if (!superToSubtypeMap.has(item.Supertype)) {
              superToSubtypeMap.set(item.Supertype, new Set());
            }
            superToSubtypeMap.get(item.Supertype).add(item.Subtype);
          }
        });
        
        populateSelect(rarityFilter, raritySet);
        populateSelect(classFilter, classSet);
        populateSelect(supertypeFilter, supertypeSet);
        updateSubtypeFilter('Any');
      })
      .catch(err => alert('Error loading item templates: '.concat(err.message)));

    /** Helper to fill a <select> element */
    function populateSelect(selectElement, itemSet) {
      const sortedItems = [...itemSet].sort();
      sortedItems.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.text = item;
        selectElement.add(opt);
      });
    }

    /** Dynamically updates the Subtype filter */
    function updateSubtypeFilter(selectedSupertype) {
        subtypeFilter.innerHTML = '';
        const anyOpt = document.createElement('option');
        anyOpt.value = "Any";
        anyOpt.text = "Any Subtype";
        subtypeFilter.add(anyOpt);

        if (selectedSupertype !== 'Any' && superToSubtypeMap.has(selectedSupertype)) {
            subtypeFilter.disabled = false;
            const subtypes = superToSubtypeMap.get(selectedSupertype);
            populateSelect(subtypeFilter, subtypes);
        } else {
            subtypeFilter.disabled = true;
        }
    }

    // --- 2. Event Listeners ---
    supertypeFilter.addEventListener('change', () => {
        updateSubtypeFilter(supertypeFilter.value);
    });

    generateBtn.addEventListener('click', () => {
      const level = parseInt(levelInput.value) || 1;
      const selectedRarity = rarityFilter.value;
      const selectedClass = classFilter.value;
      const selectedSupertype = supertypeFilter.value;
      const selectedSubtype = subtypeFilter.value;

      const filteredItems = allItems.filter(item => {
        const rarityMatch = (selectedRarity === 'Any' || item.Rarity === selectedRarity);
        const classMatch = (selectedClass === 'Any' || item.Class === selectedClass);
        const supertypeMatch = (selectedSupertype === 'Any' || item.Supertype === selectedSupertype);
        const subtypeMatch = (selectedSubtype === 'Any' || item.Subtype === selectedSubtype);
        return rarityMatch && classMatch && supertypeMatch && subtypeMatch;
      });

      if (filteredItems.length === 0) {
        alert('No items match your criteria. Please try a different combination.');
        return;
      }

      const baseItem = filteredItems[Math.floor(Math.random() * filteredItems.length)];
      const scaledItem = scaleItem(baseItem, level);

      const outputYaml = generateItemYaml(scaledItem, level);
      outputCommand.value = outputYaml;
      
      generateItemPreview(scaledItem, level); // Generate preview
      
      outputSection.style.display = 'flex';
    });
    
    copyBtn.onclick = () => {
        try {
            outputCommand.select();
            document.execCommand('copy');
            alert('YAML copied to clipboard!');
        } catch (err) {
            alert('Failed to copy. Please copy manually.');
        }
    };


    // --- 3. Item Scaling (TODO) ---
    function scaleItem(baseItem, level) {
      if (level === 1) return baseItem;
      const scaledItem = { ...baseItem };
      const scaleRate = 0.10; 
      const levelMultiplier = (level - 1) * scaleRate;

      for (const key in scaledItem) {
        if (key.includes('_') && !key.startsWith('Option_')) {
          const baseValue = parseFloat(scaledItem[key]);
          if (!isNaN(baseValue) && baseValue !== 0) {
            const scaledValue = baseValue + (baseValue * levelMultiplier);
            scaledItem[key] = Math.round(scaledValue * 100) / 100;
          }
        }
      }

      if (scaledItem.Enchantments) {
        const baseEnchants = scaledItem.Enchantments.split('\n');
        const scaledEnchants = baseEnchants.map(ench => {
          const parts = ench.split(':');
          if (parts.length === 2) {
            const name = parts[0];
            const baseLevel = parseInt(parts[1]);
            if (!isNaN(baseLevel)) {
              const scaledLevel = baseLevel + (baseLevel * levelMultiplier);
              return `${name}:${Math.max(1, Math.round(scaledLevel))}`;
            }
          }
          return ench;
        });
        scaledItem.Enchantments = scaledEnchants.join('\n');
      }
      return scaledItem;
    }

    // --- 4. YAML Generation ---
    function convertCsvRowToYamlObject(item) {
        const nestedItem = {};
        if (item.Id) nestedItem.Id = item.Id;
        if (item.Data) {
            const dataNum = parseFloat(item.Data);
            nestedItem.Data = isNaN(dataNum) ? item.Data : dataNum;
        }
        if (item.Display) nestedItem.Display = item.Display;
        
        if (item.Lore) nestedItem.Lore = item.Lore.split('\n'); 
        if (item.Enchantments) nestedItem.Enchantments = item.Enchantments.split('\n').filter(Boolean);

        const options = {};
        if (item.Option_Unbreakable === 'True' || item.Option_Unbreakable === true) {
            options.Unbreakable = true;
        }
        if (item.Option_Color) options.Color = item.Option_Color;
        if (Object.keys(options).length > 0) nestedItem.Options = options;

        const attributes = {};
        for (const slot of SLOTS) {
            const slotData = {};
            let hasData = false;
            for (const stat of STATS) {
                const key = `${slot}_${stat}`;
                const value = item[key];
                if (value) {
                    const floatVal = parseFloat(value);
                    if (!isNaN(floatVal) && String(floatVal) === String(value).trim()) {
                        slotData[stat] = floatVal;
                    } else {
                        slotData[stat] = value;
                    }
                    hasData = true;
                }
            }
            if (hasData) attributes[slot] = slotData;
        }
        if (Object.keys(attributes).length > 0) nestedItem.Attributes = attributes;
        return nestedItem;
    }

    function generateItemYaml(item, level) {
      const nestedObject = convertCsvRowToYamlObject(item);
      const finalObject = { [item.ItemName]: nestedObject };
      const header = `# ${item.Display || item.ItemName} (Level ${level})\n# Generated by Item Randomizer\n\n`;

      try {
        const yamlString = jsyaml.dump(finalObject, {
            lineWidth: -1, 
            quotingType: "'" 
        });
        return header + yamlString;
      } catch (e) {
        console.error("Error dumping YAML:", e);
        return "Error generating YAML. Check console.";
      }
    }

    // --- 5. Preview Generation  ---

    /**
     * Helper function to convert numbers to Roman Numerals
     */
    function toRomanNumeral(num) {
        if (isNaN(num) || num <= 0) return num; // Fallback
        const lookup = {M:1000, CM:900, D:500, CD:400, C:100, XC:90, L:50, XL:40, X:10, IX:9, V:5, IV:4, I:1};
        let roman = '';
        for (let i in lookup) {
            while (num >= lookup[i]) {
                roman += i;
                num -= lookup[i];
            }
        }
        return roman;
    }

    /**
     * NEW: Helper to format enchantment levels based on the new rule
     */
    function formatEnchantmentDisplay(name, level) {
        if (level >= 1 && level <= 10) {
            // Use Roman numerals for levels 1-10
            return `${name} ${toRomanNumeral(level)}`;
        } else if (level > 10) {
            // Use new format for levels 11+
            return `${name} enchantment.level.${level}`;
        } else {
            // Fallback for 0 or weird values
            return `${name} ${level}`;
        }
    }

    /**
     * Helper function to parse a line of MC-formatted text to HTML
     */
    function formatLine(line) {
        if (!line) return '<br>'; // Preserve empty lines
        
        let classes = [];
        const codes = line.match(/&([0-9a-fklmnor])/g); // Find all codes
        if (codes) {
            codes.forEach(code => {
                classes.push('mc-' + code[1]); // e.g., 'mc-b', 'mc-l'
            });
        }
        // Strip codes from the text for display
        const text = line.replace(/&[0-9a-fklmnor]/g, '');
        return `<div class="${classes.join(' ')}">${text || '&nbsp;'}</div>`; // Use &nbsp; for empty-but-styled lines
    }

    /**
     * UPDATED: Generates the HTML for the preview pane
     */
    function generateItemPreview(item, level) {
        previewPane.innerHTML = ''; // Clear old preview

        // 1. Title (from Display field)
        previewPane.innerHTML += formatLine(item.Display);
        
        // 2. Enchantments (scaled)
        if (item.Enchantments) {
            const enchants = item.Enchantments.split('\n');
            enchants.forEach(ench => {
                const [bukkitName, levelStr] = ench.split(':');
                const level = parseInt(levelStr);

                if (!bukkitName || isNaN(level)) {
                    previewPane.innerHTML += formatLine('&7' + ench); // Fallback
                    return; 
                }
                
                const minecraftName = ENCHANTMENT_MAP[bukkitName] || bukkitName; 
                const levelDisplay = formatEnchantmentDisplay(minecraftName, level);
                    
                previewPane.innerHTML += formatLine(`&7${levelDisplay}`);
            });
        }

        // 3. Lore (from original Lore field)
        if (item.Lore) {
            item.Lore.split('\n').forEach(line => {
                let modifiedLine = line;
                // Check for italic code (&o)
                if (modifiedLine.includes('&o')) {
                    // Replace the first *color* code (e.g., &b, &6) with &5 (purple)
                    modifiedLine = modifiedLine.replace(/&[0-9a-f]/, '&5');
                }
                previewPane.innerHTML += formatLine(modifiedLine);
            });
        }
        
        // 4. Stats (scaled)
        let hasStats = false;
        const statGroups = new Map(); 

        for (const key in item) {
            if (key.includes('_') && !key.startsWith('Option_') && item[key]) {
                const [slot, stat] = key.split('_');
                const value = item[key];
                
                if (value && (parseFloat(value) !== 0 || String(value).includes('%'))) {
                    if (!statGroups.has(slot)) statGroups.set(slot, []);
                    statGroups.get(slot).push({ stat, value });
                    hasStats = true;
                }
            }
        }

        if (hasStats) {
            previewPane.innerHTML += '<div class="mc-separator"></div>';
            
            for (const [slot, stats] of statGroups.entries()) {
                previewPane.innerHTML += formatLine(`&7When on ${slot}:`); 
                
                stats.forEach(({ stat, value }) => {
                    const statName = stat.replace(/([A-Z])/g, ' $1').trim();
                    let displayValue = '';
                    if (String(value).includes('%')) {
                        displayValue = value.startsWith('+') ? value : `+${value}`;
                    } else {
                        const numVal = parseFloat(value);
                        displayValue = numVal > 0 ? `+${numVal}` : String(numVal);
                    }
                    previewPane.innerHTML += formatLine(`&9 ${displayValue} ${statName}`);
                });
            }
        }
    }
});