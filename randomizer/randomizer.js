document.addEventListener('DOMContentLoaded', () => {
    const CSV_PATH = '../ellen_items.csv'; 
    
    let allItems = [];
    const raritySet = new Set();
    const classSet = new Set();
    const typeSet = new Set();

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
    const typeFilter = document.getElementById('typeFilter');
    const levelInput = document.getElementById('itemLevel');
    const generateBtn = document.getElementById('generateBtn');

    // --- Output Elements ---
    const outputSection = document.getElementById('outputSection');
    const outputCommand = document.getElementById('outputCommand');
    const copyBtn = document.getElementById('copyBtn');
    const previewPane = document.getElementById('previewPane');

    // --- Load Data and Create Filters ---
    fetch(CSV_PATH)
      .then(response => response.text())
      .then(csvText => {
        const results = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        
        allItems = results.data.filter(r => r.ItemName);
        
        allItems.forEach(item => {
          if (item.Rarity) raritySet.add(item.Rarity);
          if (item.Class) classSet.add(item.Class);
          if (item.Type) typeSet.add(item.Type); // Collect Types
        });
        
        populateSelect(rarityFilter, raritySet);
        populateSelect(classFilter, classSet);
        populateSelect(typeFilter, typeSet);
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

    // Event Listeners (aka button pressing)
    generateBtn.addEventListener('click', () => {
      const level = parseInt(levelInput.value) || 1;
      const selectedRarity = rarityFilter.value;
      const selectedClass = classFilter.value;
      const selectedType = typeFilter.value;

      const filteredItems = allItems.filter(item => {
        const rarityMatch = (selectedRarity === 'Any' || item.Rarity === selectedRarity);
        const classMatch = (selectedClass === 'Any' || item.Class === selectedClass);
        const typeMatch = (selectedType === 'Any' || item.Type === selectedType);
        return rarityMatch && classMatch && typeMatch;
      });

      if (filteredItems.length === 0) {
        alert('No items match your criteria. Please try a different combination.');
        return;
      }

      const baseItem = filteredItems[Math.floor(Math.random() * filteredItems.length)];
      const scaledItem = scaleItem(baseItem, level);

      const outputYaml = generateItemYaml(scaledItem, level);
      outputCommand.value = outputYaml;
      
      generateItemPreview(scaledItem, level);
      
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


    // Item Scaling (TODO)
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

    // Create YAML object
    function convertCsvRowToYamlObject(item, level) {
        const nestedItem = {};
        if (item.Id) nestedItem.Id = item.Id;
        if (item.Display) nestedItem.Display = item.Display;
        if (item.Model) nestedItem.Model = parseInt(item.Model) || item.Model;

        // --- Reconstruct Lore ---
        const loreList = [];
        
        // Potion Effects
        if (item.PotionEffects) {
            item.PotionEffects.split('\n').forEach(eff => loreList.push(`&7${eff}`));
        }
        
        // Flavor Text
        if (item.FlavorText) {
            item.FlavorText.split('\n').forEach(flav => loreList.push(`&b&o${flav}`));
        }        

        loreList.push(''); // Empty Row
        
        // Ability
        if (item.Ability) loreList.push(`&9[${item.Ability}]`);
        
        loreList.push(''); // Empty Row
        
        // Level, Class, Type
        loreList.push(`&9[Level ${level}]`); // Use dynamic level
        if (item.Class) loreList.push(`&9[${item.Class}]`);
        if (item.Type) loreList.push(`&9[${item.Type}]`);

        nestedItem.Lore = loreList;

        // --- Enchantments ---
        if (item.Enchantments) nestedItem.Enchantments = item.Enchantments.split('\n').filter(Boolean);

        // --- Options & Trims ---
        const options = {};
        if (item.Option_Unbreakable === 'True' || item.Option_Unbreakable === true) options.Unbreakable = true;
        if (item.Option_SkinTexture) options.SkinTexture = item.Option_SkinTexture;
        
        // Trims
        if (item.Trim_Material || item.Trim_Pattern) {
            options.Trim = {
                Material: item.Trim_Material,
                Pattern: item.Trim_Pattern
            };
        }
        if (Object.keys(options).length > 0) nestedItem.Options = options;

        // --- Banner Layers ---
        if (item.BannerLayers) {
            nestedItem.BannerLayers = item.BannerLayers.split('\n').filter(Boolean);
        }

        // --- Attributes (Slots) ---
        const attributes = {};
        for (const slot of SLOTS) {
            const slotData = {};
            let hasData = false;
            for (const stat of STATS) {
                const key = `${slot}_${stat}`;
                const value = item[key];
                if (value && value !== 'NaN') {
                    const floatVal = parseFloat(value);
                    slotData[stat] = (!isNaN(floatVal) && String(floatVal) === String(value).trim()) ? floatVal : value;
                    hasData = true;
                }
            }
            if (hasData) attributes[slot] = slotData;
        }
        if (Object.keys(attributes).length > 0) nestedItem.Attributes = attributes;

        // --- Custom Stats (Mythic Mobs) ---
        const customStats = [];
        for (const key in item) {
            if (key.startsWith('Stat_') && item[key] && item[key] !== 'NaN') {
                const statName = key.replace('Stat_', '');
                customStats.push(`${statName} ${item[key]}`);
            }
        }
        if (customStats.length > 0) nestedItem.Stats = customStats;
        
        // --- Hide Flags ---
        if (item.Hide) {
             nestedItem.Hide = item.Hide.split('|');
        }

        return nestedItem;
    }

    function generateItemYaml(item, level) {
      const nestedObject = convertCsvRowToYamlObject(item, level);
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

    // Preview Generation

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
     * Helper to format enchantment levels based on the new rule
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
     * Generates the HTML for the preview pane
     */
    /**
     * Generates the HTML for the preview pane
     */
    function generateItemPreview(item, level) {
        previewPane.innerHTML = ''; 

        // --- Calculate Stats---
        let hasStats = false;
        const statGroups = new Map(); // Key: Slot, Value: Array of {stat, value}

        SLOTS.forEach(slot => {
            STATS.forEach(stat => {
                const key = `${slot}_${stat}`;
                const value = item[key];
                
                if (value && value !== 'NaN') {
                    if (!statGroups.has(slot)) {
                        statGroups.set(slot, []);
                    }
                    statGroups.get(slot).push({ stat, value });
                    hasStats = true;
                }
            });
        });

        // --- Render Title & Lore ---
        // Title
        previewPane.innerHTML += formatLine(item.Display);
        
        // Potion Effects
        if (item.PotionEffects) {
             item.PotionEffects.split('\n').forEach(eff => {
                 previewPane.innerHTML += formatLine(`&7${eff}`);
             });
        }
        
        // Flavor Text 
        if (item.FlavorText) {
             item.FlavorText.split('\n').forEach(flav => {
                 previewPane.innerHTML += formatLine(`&b&o${flav}`);
             });
        }
        
        previewPane.innerHTML += formatLine(''); // Spacer

        // Ability
        if (item.Ability) previewPane.innerHTML += formatLine(`&9[${item.Ability}]`);

        previewPane.innerHTML += formatLine(''); // Spacer

        // Tags
        previewPane.innerHTML += formatLine(`&9[Level ${level}]`);
        if (item.Class) previewPane.innerHTML += formatLine(`&9[${item.Class}]`);
        if (item.Type) previewPane.innerHTML += formatLine(`&9[${item.Type}]`);

        previewPane.innerHTML += '<div class="mc-separator"></div>';

        // --- Render Custom Stats ---
        for (const key in item) {
            if (key.startsWith('Stat_') && item[key] && item[key] !== 'NaN') {
                const statName = key.replace('Stat_', '').replace(/_/g, ' '); // Clean up name
                previewPane.innerHTML += formatLine(`&7${statName}: &f${item[key]}`);
            }
        }

        // --- Render Normal Stats ---
        if (hasStats) {
            previewPane.innerHTML += '<div class="mc-separator"></div>';
            
            for (const [slot, stats] of statGroups.entries()) {
              if (slot === 'MainHand' || slot === 'OffHand') {
                  previewPane.innerHTML += formatLine(`&7When in ${slot}:`);
              } else {
                previewPane.innerHTML += formatLine(`&7When on ${slot}:`); 
              }
              
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