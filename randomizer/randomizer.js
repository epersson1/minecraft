document.addEventListener('DOMContentLoaded', () => {
    // Point to the new csv file
    const CSV_PATH = '../items_parsed_v2.csv'; 
    
    let allItems = [];
    const raritySet = new Set();
    const classSet = new Set();
    const supertypeSet = new Set();
    // Store relationships like: "Melee" -> {"Sword", "Axe", "Shovel"}
    const superToSubtypeMap = new Map();

    // Get all the filter elements
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
        
        // Use a single pass to populate all Sets and Maps
        allItems.forEach(item => {
          if (item.Rarity) raritySet.add(item.Rarity);
          if (item.Class) classSet.add(item.Class);
          if (item.Supertype) supertypeSet.add(item.Supertype);
          
          // Populate the Supertype -> Subtype mapping
          if (item.Supertype && item.Subtype) {
            if (!superToSubtypeMap.has(item.Supertype)) {
              superToSubtypeMap.set(item.Supertype, new Set());
            }
            superToSubtypeMap.get(item.Supertype).add(item.Subtype);
          }
        });
        
        // Populate the static filter dropdowns
        populateSelect(rarityFilter, raritySet);
        populateSelect(classFilter, classSet);
        populateSelect(supertypeFilter, supertypeSet);

        // Set initial state for the dynamic subtype filter
        updateSubtypeFilter('Any');
      })
      .catch(err => alert('Error loading item templates: ' + err.message));

    /** Helper to fill a <select> element from a Set */
    function populateSelect(selectElement, itemSet) {
      const sortedItems = [...itemSet].sort();
      sortedItems.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.text = item;
        selectElement.add(opt);
      });
    }

    /**
     * DYNAMICALLY updates the Subtype filter based on the selected Supertype
     */
    function updateSubtypeFilter(selectedSupertype) {
        // Clear old options
        subtypeFilter.innerHTML = '';
        const anyOpt = document.createElement('option');
        anyOpt.value = "Any";
        anyOpt.text = "Any Subtype";
        subtypeFilter.add(anyOpt);

        // Check if we have subtypes for this supertype
        if (selectedSupertype !== 'Any' && superToSubtypeMap.has(selectedSupertype)) {
            subtypeFilter.disabled = false;
            const subtypes = superToSubtypeMap.get(selectedSupertype);
            populateSelect(subtypeFilter, subtypes);
        } else {
            // No supertype selected, or no subtypes exist for it
            subtypeFilter.disabled = true;
        }
    }

    // --- 2. Event Listeners ---

    // Add the listener for the Supertype dropdown
    supertypeFilter.addEventListener('change', () => {
        updateSubtypeFilter(supertypeFilter.value);
    });

    // The main Generate button logic
    generateBtn.addEventListener('click', () => {
      const level = parseInt(levelInput.value) || 1;
      const selectedRarity = rarityFilter.value;
      const selectedClass = classFilter.value;
      const selectedSupertype = supertypeFilter.value;
      const selectedSubtype = subtypeFilter.value;

      // Filter the items based on ALL selections
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

      // Select a random item from the filtered list
      const baseItem = filteredItems[Math.floor(Math.random() * filteredItems.length)];
      
      // Scale the item to the desired level
      const scaledItem = scaleItem(baseItem, level);

      // Format and display the output
      const outputString = formatItemOutput(scaledItem, level);
      outputCommand.value = outputString;
      outputSection.style.display = 'block';
    });
    
    copyBtn.onclick = () => {
        outputCommand.select();
        // Using document.execCommand as navigator.clipboard might be restricted in some environments
        try {
            outputCommand.select();
            document.execCommand('copy');
            alert('Output copied to clipboard!');
        } catch (err) {
            alert('Failed to copy. Please copy manually.');
        }
    };


    // --- 3. Item Scaling and Formatting ---

    /**
     * Scales an item based on the fake math (10% of base per level).
     */
    function scaleItem(baseItem, level) {
      if (level === 1) return baseItem;

      const scaledItem = { ...baseItem };
      const scaleRate = 0.10; // 10% per level
      const levelMultiplier = (level - 1) * scaleRate;

      // Scale all numeric stats
      for (const key in scaledItem) {
        if (key.includes('_') && !key.startsWith('Option_')) {
          const baseValue = parseFloat(scaledItem[key]);
          if (!isNaN(baseValue) && baseValue !== 0) {
            const scaledValue = baseValue + (baseValue * levelMultiplier);
            scaledItem[key] = Math.round(scaledValue * 100) / 100;
          }
        }
      }

      // Scale Enchantments
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
     * Creates a human-readable string stub for the final command.
     */
    function formatItemOutput(item, level) {
      let output = `## ${item.Display || item.ItemName} (Level ${level}) ##\n\n`;
      
      output += `## ITEM DETAILS ##\n`;
      output += `Internal Name: ${item.ItemName}\n`;
      output += `Minecraft ID: ${item.Id}\n`;
      output += `Rarity: ${item.Rarity || 'N/A'}\n`;
      output += `Class: ${item.Class || 'N/A'}\n`;
      output += `Type: ${item.Supertype || 'N/A'}${item.Subtype ? ` (${item.Subtype})` : ''}\n\n`;

      if (item.Enchantments) {
        output += `## SCALED ENCHANTMENTS ##\n${item.Enchantments}\n\n`;
      }

      output += `## SCALED STATS ##\n`;
      let hasStats = false;
      for (const key in item) {
        if (key.includes('_') && !key.startsWith('Option_') && item[key]) {
          const value = item[key];
          // Check for a non-zero, parsable number
          const numValue = parseFloat(value);
          if (!isNaN(numValue) && numValue !== 0) {
             output += `${key}: ${value}\n`;
             hasStats = true;
          } else if (isNaN(numValue) && typeof value === 'string' && value.includes('%')) {
            // Also capture percentage-based stats like "+30%"
            output += `${key}: ${value}\n`;
            hasStats = true;
          }
        }
      }
      if (!hasStats) output += `(No numerical stats to scale for this item)\n`;
      
      output += `\n## ORIGINAL LORE ##\n${item.Lore}\n`;
      
      return output;
    }
});
