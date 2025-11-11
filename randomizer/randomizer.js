document.addEventListener('DOMContentLoaded', () => {
    // Note the path change to go *up* one directory to find the item-creator folder
    const CSV_PATH = '../item-creator/items_parsed.csv';
    let allItems = [];
    const factionSet = new Set();
    const typeSet = new Set();

    const factionFilter = document.getElementById('factionFilter');
    const typeFilter = document.getElementById('typeFilter');
    const levelInput = document.getElementById('itemLevel');
    const generateBtn = document.getElementById('generateBtn');
    const outputSection = document.getElementById('outputSection');
    const outputCommand = document.getElementById('outputCommand');
    const copyBtn = document.getElementById('copyBtn');

    // --- 1. Data Loading and Filter Population ---

    fetch(CSV_PATH)
      .then(response => {
        if (!response.ok) throw new Error('Could not fetch CSV');
        return response.text();
      })
      .then(csvText => {
        const results = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        allItems = results.data
          .filter(r => r.ItemName) // Ensure item has a name
          .map(item => {
            // Parse Lore to find Faction and Type
            const [faction, itemType] = parseLore(item.Lore);
            item.faction = faction;
            item.itemType = itemType;
            if (faction) factionSet.add(faction);
            if (itemType) typeSet.add(itemType);
            return item;
          });
        
        // Populate filter dropdowns
        populateSelect(factionFilter, factionSet);
        populateSelect(typeFilter, typeSet);
      })
      .catch(err => alert('Error loading item templates: ' + err.message));

    /**
     * Parses Faction and Type from a Lore string.
     * Example Lore: "&9[Angelic]\n&9[Melee, Sword]"
     */
    function parseLore(loreString) {
      let faction = null;
      let type = null;
      
      if (typeof loreString !== 'string') return [null, null];

      const lines = loreString.split('\n');
      for (const line of lines) {
        if (line.includes('[') && line.includes(']')) {
          const tag = line.substring(line.indexOf('[') + 1, line.indexOf(']'));
          
          // Check for a simple faction tag, e.g., [Angelic], [Nether]
          if (!tag.includes(',')) {
            faction = tag;
          }
          // Check for a type tag, e.g., [Melee, Sword], [Armor, Helmet]
          else if (tag.includes(',')) {
            type = tag.split(',')[0].trim(); // Just grab the main type (Melee, Armor, etc.)
          }
        }
      }
      return [faction, type];
    }

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

    // --- 2. Item Generation Logic ---

    generateBtn.addEventListener('click', () => {
      const level = parseInt(levelInput.value) || 1;
      const selectedFaction = factionFilter.value;
      const selectedType = typeFilter.value;

      // Filter the items based on selection
      const filteredItems = allItems.filter(item => {
        const factionMatch = (selectedFaction === 'Any' || item.faction === selectedFaction);
        const typeMatch = (selectedType === 'Any' || item.itemType === selectedType);
        return factionMatch && typeMatch;
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

    /**
     * Scales an item based on the "fake math" (10% of base per level).
     */
    function scaleItem(baseItem, level) {
      if (level === 1) return baseItem;

      const scaledItem = { ...baseItem };
      const scaleRate = 0.10; // 10% per level
      const levelMultiplier = (level - 1) * scaleRate;

      // Scale all numeric stats
      for (const key in scaledItem) {
        // Check if key is a stat (e.g., "MainHand_Damage", "Chest_Armor")
        if (key.includes('_') && !key.startsWith('Option_')) {
          const baseValue = parseFloat(scaledItem[key]);
          if (!isNaN(baseValue) && baseValue !== 0) {
            // Formula: scaledStat = baseStat + (baseStat * (level - 1) * 0.10)
            const scaledValue = baseValue + (baseValue * levelMultiplier);
            // Round to 2 decimal places
            scaledItem[key] = Math.round(scaledValue * 100) / 100;
          }
        }
      }

      // Scale Enchantments (e.g., "DAMAGE_ALL:97")
      if (scaledItem.Enchantments) {
        const baseEnchants = scaledItem.Enchantments.split('\n');
        const scaledEnchants = baseEnchants.map(ench => {
          const parts = ench.split(':');
          if (parts.length === 2) {
            const name = parts[0];
            const baseLevel = parseInt(parts[1]);
            if (!isNaN(baseLevel)) {
              // Same scaling logic
              const scaledLevel = baseLevel + (baseLevel * levelMultiplier);
              // Enchant levels are usually integers
              return `${name}:${Math.max(1, Math.round(scaledLevel))}`;
            }
          }
          return ench; // Return as-is if format is unexpected
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
      output += `Internal Name: ${item.ItemName}\n`;
      output += `Minecraft ID: ${item.Id}\n\n`;

      output += `## LORE ##\n${item.Lore}\n\n`;
      
      if (item.Enchantments) {
        output += `## SCALED ENCHANTMENTS ##\n${item.Enchantments}\n\n`;
      }

      output += `## SCALED STATS ##\n`;
      let hasStats = false;
      for (const key in item) {
        if (key.includes('_') && !key.startsWith('Option_') && item[key]) {
          const value = item[key];
          if (value && !isNaN(parseFloat(value))) {
             output += `${key}: ${value}\n`;
             hasStats = true;
          }
        }
      }
      if (!hasStats) output += `(No numerical stats to scale for this item)\n`;
      
      return output;
    }

    // --- 3. Utility ---
    copyBtn.onclick = () => {
        outputCommand.select();
        navigator.clipboard.writeText(outputCommand.value)
            .then(() => alert('Output copied to clipboard!'))
            .catch(err => alert('Failed to copy: ' + err));
    };
});