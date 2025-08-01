document.addEventListener('DOMContentLoaded', () => {
    const CSV_PATH = './items_parsed.csv';
    const STORAGE_KEY = 'rpg_items';
    let df = [];
    const SLOTS = ["MainHand","OffHand","Head","Chest","Legs","Feet"];
    const STATS = ["Armor","ArmorToughness","KnockbackResistance","Health","AttackSpeed","MovementSpeed","Damage","Luck"];
    let templateData = null;
    let savedItems = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

    const startScreen = document.getElementById('start-screen');
    const itemForm = document.getElementById('itemForm');
    const templateSelect = document.getElementById('templateSelect');
    const basicFieldsDiv = document.getElementById('basicFields');
    const slotSectionsDiv = document.getElementById('slotSections');

    // Load CSV templates via fetch + PapaParse
    fetch(CSV_PATH)
      .then(response => {
        if (!response.ok) throw new Error('Could not fetch CSV');
        return response.text();
      })
      .then(csvText => {
        const results = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        df = results.data.filter(r => r.ItemName);
        df.forEach(row => {
          const opt = document.createElement('option');
          opt.value = row.ItemName;
          opt.text = row.ItemName;
          templateSelect.add(opt);
        });
      })
      .catch(err => alert('Error loading templates: ' + err.message));

    // Event handlers
    document.getElementById('useTemplateBtn').onclick = () => {
      templateData = df.find(r => r.ItemName === templateSelect.value);
      showItemForm();
    };
    document.getElementById('newItemBtn').onclick = () => { templateData = null; showItemForm(); };
    document.getElementById('backBtn').onclick = () => showStart();
    document.getElementById('saveBtn').onclick = () => saveItem();

    function showStart() {
      itemForm.style.display = 'none';
      startScreen.style.display = 'block';
    }

    function showItemForm() {
      basicFieldsDiv.innerHTML = '';
      slotSectionsDiv.innerHTML = '';

      const fields = [
        ["Internal Name", "ItemName"],
        ["Minecraft ID", "Id"],
        ["Data (optional)", "Data"],
        ["Display Name", "Display"],
        ["Lore (one per line)", "Lore"],
        ["Enchantments (one per line)", "Enchantments"],
        ["Unbreakable", "Option_Unbreakable"],
        ["Color (RGB hex)", "Option_Color"],
      ];
      fields.forEach(([label, key]) => {
        const fg = document.createElement('div'); fg.className = 'form-group';
        const lbl = document.createElement('label'); lbl.textContent = label;
        fg.appendChild(lbl);
        let inp;
        if (key === 'Lore' || key === 'Enchantments') {
          inp = document.createElement('textarea'); inp.rows=3; inp.className='form-control';
        } else if (key === 'Option_Unbreakable') {
          inp = document.createElement('input'); inp.type='checkbox'; inp.className='form-check-input';
        } else {
          inp = document.createElement('input'); inp.type='text'; inp.className='form-control';
        }
        inp.id = key;
        if (templateData && templateData[key]) {
          if (inp.type === 'checkbox') inp.checked = (templateData[key] === 'True' || templateData[key] === true);
          else inp.value = templateData[key];
        }
        fg.appendChild(inp);
        basicFieldsDiv.appendChild(fg);
      });

      SLOTS.forEach(slot => {
        const card = document.createElement('div'); card.className='card mb-2';
        const header = document.createElement('div'); header.className='card-header';
        const chk = document.createElement('input'); chk.type='checkbox'; chk.id=`chk_${slot}`; chk.className='form-check-input mr-2';
        header.appendChild(chk);
        header.appendChild(document.createTextNode(slot));
        card.appendChild(header);
        const body = document.createElement('div'); body.className='card-body'; body.style.display='none';
        STATS.forEach(stat => {
          const fg = document.createElement('div'); fg.className='form-group row';
          const lbl = document.createElement('label'); lbl.className='col-sm-4 col-form-label'; lbl.textContent=stat;
          const entDiv = document.createElement('div'); entDiv.className='col-sm-8';
          const ent = document.createElement('input'); ent.type='text'; ent.className='form-control'; ent.id=`${slot}_${stat}`;
          if (templateData && templateData[`${slot}_${stat}`]) {
            chk.checked = true; body.style.display='block'; ent.value = templateData[`${slot}_${stat}`];
          }
          entDiv.appendChild(ent);
          fg.appendChild(lbl); fg.appendChild(entDiv);
          body.appendChild(fg);
        });
        card.appendChild(body);
        slotSectionsDiv.appendChild(card);
        chk.addEventListener('change', () => { body.style.display = chk.checked ? 'block' : 'none'; });
      });

      startScreen.style.display = 'none';
      itemForm.style.display = 'block';
    }

    function saveItem() {
      const name = document.getElementById('ItemName').value.trim();
      if (!name) { alert('Item name is required'); return; }
      const item = {
        Id: document.getElementById('Id').value,
        Display: document.getElementById('Display').value
      };
      const lore = document.getElementById('Lore').value.split('\n').map(l=>l.trim()).filter(Boolean);
      if (lore.length) item.Lore = lore;
      const ench = document.getElementById('Enchantments').value.split('\n').map(l=>l.trim()).filter(Boolean);
      if (ench.length) item.Enchantments = ench;
      const dataVal = document.getElementById('Data').value;
      if (dataVal) item.Data = Number(dataVal);
      const opts = {};
      if (document.getElementById('Option_Unbreakable').checked) opts.Unbreakable = true;
      const colorVal = document.getElementById('Option_Color').value.trim();
      if (colorVal) opts.Color = colorVal;
      if (Object.keys(opts).length) item.Options = opts;
      const attrs = {};
      SLOTS.forEach(slot => {
        if (document.getElementById(`chk_${slot}`).checked) {
          const sd = {};
          STATS.forEach(stat => {
            const val = document.getElementById(`${slot}_${stat}`).value.trim();
            if (val) sd[stat] = val;
          });
          if (Object.keys(sd).length) attrs[slot] = sd;
        }
      });
      if (Object.keys(attrs).length) item.Attributes = attrs;

      savedItems[name] = item;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedItems));
      const yamlStr = jsyaml.dump(savedItems);
      const blob = new Blob([yamlStr], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'items.yml';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      showStart();
    }
  });