document.addEventListener('DOMContentLoaded', () => {
    // Point to the new, richer CSV file
    const CSV_PATH = '../items_parsed_v2.csv'; 
    
    let allItems = [];
    const raritySet = new Set();
    const classSet = new Set();
    const supertypeSet = new Set();
    const superToSubtypeMap = new Map();

    // These are the stats we'll look for when building Attributes
    const SLOTS = ["MainHand", "OffHand", "Head", "Chest", "Legs", "Feet"];
    const STATS = ["Armor", "ArmorToughness", "KnockbackResistance", "Health", "AttackSpeed", "MovementSpeed", "Damage", "Luck"];

    // Get all the new filter elements
    const rarityFilter = document.getElementById('rarityFilter');
    const classFilter = document.getElementById('classFilter');
    const supertypeFilter = document.getElementById('supertypeFilter');
    const subtypeFilter = document.getElementById('subtypeFilter');
    
    const levelInput = document.getElementById('itemLevel');
    const generateBtn = document.getElementById('generateBtn');
    const outputSection = document.getElementById('outputSection');
    const outputCommand = document.getElementById('outputCommand');
    const copyBtn = document.getElementById('copyBtn');

    // --- 1. Data Loading and Filter Population ---
    fetch(CSV_PATH)
      .then(response => {
        if (!response.ok) throw new Error('Could not fetch CSV.');
        return response.text();
      })
      .then(csvText => {
        const results = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        
        allItems = results.data.filter(r => r.ItemName); // Ensure item has a name
        
        // Use a single pass to populate all our Sets and Maps
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

    /** DYNAMICALLY updates the Subtype filter */
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

      // --- Generate YAML output ---
      const outputYaml = generateItemYaml(scaledItem, level);
      outputCommand.value = outputYaml;
      outputSection.style.display = 'block';
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


    // --- 3. Item Scaling and Formatting ---

    function scaleItem(baseItem, level) {
      if (level === 1) return baseItem;

      const scaledItem = { ...baseItem };
      const scaleRate = 0.10; // 10% per level
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

    /**
     * Converts a flat CSV row object into a nested
     * object suitable for YAML conversion.
     */
    function convertCsvRowToYamlObject(item) {
        const nestedItem = {};

        // 1. Basic Fields
        if (item.Id) nestedItem.Id = item.Id;
        if (item.Data) {
            const dataNum = parseFloat(item.Data);
            nestedItem.Data = isNaN(dataNum) ? item.Data : dataNum;
        }
        if (item.Display) nestedItem.Display = item.Display;
        
        // 2. List Fields
        if (item.Lore) nestedItem.Lore = item.Lore.split('\n').filter(Boolean);
        if (item.Enchantments) nestedItem.Enchantments = item.Enchantments.split('\n').filter(Boolean);

        // 3. Options (nested under 'Options')
        const options = {};
        if (item.Option_Unbreakable === 'True' || item.Option_Unbreakable === true) {
            options.Unbreakable = true;
        }
        if (item.Option_Color) options.Color = item.Option_Color;
        
        if (Object.keys(options).length > 0) {
            nestedItem.Options = options;
        }

        // 4. Attributes (nested under 'Attributes')
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
                        slotData[stat] = floatVal; // Store as number
                    } else {
                        slotData[stat] = value; // Store as string (e.g., "+30%")
                    }
                    hasData = true;
                }
            }
            if (hasData) {
                attributes[slot] = slotData;
            }
        }
        if (Object.keys(attributes).length > 0) {
            nestedItem.Attributes = attributes;
        }

        return nestedItem;
    }

    /**
     * Generates the final, copy-pasteable YAML string
     * for a single item.
     */
    function generateItemYaml(item, level) {
      // Convert the flat CSV row object to the nested structure
      const nestedObject = convertCsvRowToYamlObject(item);
      
      // Wrap it in its ItemName (e.g., "AdamDefenderofFaith: { ... }")
      const finalObject = { [item.ItemName]: nestedObject };

      // Create a header
      const header = `# ${item.Display || item.ItemName} (Level ${level})\n# Generated by Item Randomizer\n\n`;

      // Dump to YAML string
      try {
        const yamlString = jsyaml.dump(finalObject, {
            lineWidth: -1, // No line wrapping
            quotingType: '"' // Use double quotes for strings
        });
        return header + yamlString;
      } catch (e) {
        console.error("Error dumping YAML:", e);
        return "Error generating YAML. Check console.";
      }
    }
});