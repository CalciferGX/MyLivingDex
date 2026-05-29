const CSV_URL = 'data.csv';
let allRows = [];
let activeFilters = [];
let headers = [];
let toggleState = {
    mega: false,
    excludeAlternates: false,
    region: false,
    generation: null
};

function parseCsv(text) {
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length <= 1) return { headers: [], rows: [] };

    const parsedHeaders = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
        const values = line.split(',');
        return parsedHeaders.reduce((obj, header, index) => {
            obj[header] = (values[index] || '').trim();
            return obj;
        }, {});
    });

    return { headers: parsedHeaders, rows };
}

function loadCsv(url) {
    return fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.text();
        })
        .then(parseCsv);
}

function matchesSearch(row) {
    if (activeFilters.length === 0) return true;

    const haystacks = Object.values(row).map(value => String(value).toLowerCase());

    return activeFilters.every(filter =>
        haystacks.some(value => value.includes(filter))
    );
}

function matchesToggleFilters(row) {
    if (toggleState.mega && getField(row, 'Mega_Evolution_Flag', 'Mega Flag', 'Mega') !== 'Mega') {
        return false;
    }

    const alternateFlag = getField(row, 'Alternate_Form_Flag', 'AlternateFormFlag', 'Alternate_Form', 'Is_Alternate_Form', 'Redundant_Form_Flag');
    if (toggleState.excludeAlternates && String(alternateFlag) === '1') {
        return false;
    }

    if (toggleState.region && !getField(row, 'Region_Form', 'Region Form', 'Region', 'Region_Form_')) {
        return false;
    }

    if (toggleState.generation !== null && String(row.Generation) !== String(toggleState.generation)) {
        return false;
    }

    return true;
}

function filterRows() {
    return allRows.filter(row => matchesSearch(row) && matchesToggleFilters(row));
}

function updateList() {
    renderFilters();
    renderToggleFilters();
    renderList(filterRows());
}

function renderFilters() {
    const container = document.getElementById('activeFilters');
    container.innerHTML = '';

    activeFilters.forEach((filter, index) => {
        const tag = document.createElement('span');
        tag.className = 'filter-tag';
        tag.textContent = filter;

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.className = 'remove-filter';
        removeBtn.onclick = () => {
            activeFilters.splice(index, 1);
            updateList();
        };

        tag.appendChild(removeBtn);
        container.appendChild(tag);
    });
}

function renderToggleFilters() {
    const container = document.getElementById('toggleFilters');
    container.innerHTML = '';

    const megaBtn = document.createElement('button');
    megaBtn.type = 'button';
    megaBtn.className = `toggle-chip${toggleState.mega ? ' active' : ''}`;
    megaBtn.textContent = 'Mega only';
    megaBtn.addEventListener('click', () => {
        toggleState.mega = !toggleState.mega;
        renderToggleFilters();
        updateList();
    });
    container.appendChild(megaBtn);

    const excludeAlternatesBtn = document.createElement('button');
    excludeAlternatesBtn.type = 'button';
    excludeAlternatesBtn.className = `toggle-chip${toggleState.excludeAlternates ? ' active' : ''}`;
    excludeAlternatesBtn.textContent = 'Exclude alternate forms';
    excludeAlternatesBtn.addEventListener('click', () => {
        toggleState.excludeAlternates = !toggleState.excludeAlternates;
        renderToggleFilters();
        updateList();
    });
    container.appendChild(excludeAlternatesBtn);

    const regionBtn = document.createElement('button');
    regionBtn.type = 'button';
    regionBtn.className = `toggle-chip${toggleState.region ? ' active' : ''}`;
    regionBtn.textContent = 'Region form';
    regionBtn.addEventListener('click', () => {
        toggleState.region = !toggleState.region;
        renderToggleFilters();
        updateList();
    });
    container.appendChild(regionBtn);

    const generationValues = [...new Set(allRows.map(row => row.Generation).filter(Boolean))].sort((a, b) => Number(a) - Number(b));

    generationValues.forEach(value => {
        const genBtn = document.createElement('button');
        genBtn.type = 'button';
        genBtn.className = `toggle-chip${toggleState.generation === value ? ' active' : ''}`;
        genBtn.textContent = `Gen ${value}`;
        genBtn.addEventListener('click', () => {
            toggleState.generation = toggleState.generation === value ? null : value;
            renderToggleFilters();
            updateList();
        });
        container.appendChild(genBtn);
    });
}

function getField(row, ...candidates) {
    for (const key of candidates) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
            return row[key];
        }
    }
    return '';
}

function getSecondaryText(row) {
    const details = [];

    const regionText = getField(row, 'Region_Form', 'Region Form', 'Region', 'Region_Form_');
    if (regionText) details.push(regionText);

    if (getField(row, 'Mega_Evolution_Flag', 'Mega Flag', 'Mega') === 'Mega') {
        details.push('Mega');
    }

    const formText = getField(row, 'Form Name', 'Form_Name', 'Form_Name_', 'Form');
    if (formText) details.push(formText);

    const displayName = getField(row, 'Name', 'Display Name', 'Pokemon Name');
    const originalName = getField(row, 'Original_Name', 'Original Name');
    if (displayName && displayName !== originalName) {
        details.push(displayName);
    }

    return details.join(' ');
}

function renderList(rows) {
    const container = document.getElementById('pokemonList');
    container.innerHTML = '';

    if (rows.length === 0) {
        const empty = document.createElement('div');
        empty.textContent = 'No matching Pokémon found.';
        empty.className = 'empty-state';
        container.appendChild(empty);
        return;
    }

    rows.forEach(row => {
        const branchCode = row.Branch_Code || '';
        const primaryName = row.Original_Name || row.Name || 'Unknown';
        const secondaryText = getSecondaryText(row);

        const button = document.createElement('button');
        button.className = 'pokemon-button';

        if (branchCode) {
            const img = document.createElement('img');
            img.src = `images/${branchCode}.png`;
            img.alt = primaryName;
            img.className = 'pokemon-thumb';
            img.onerror = () => {
                img.style.display = 'none';
            };
            button.appendChild(img);
        }

        const textWrap = document.createElement('div');
        textWrap.className = 'pokemon-text';

        const primaryLabel = document.createElement('span');
        primaryLabel.className = 'pokemon-primary';
        primaryLabel.textContent = primaryName;
        textWrap.appendChild(primaryLabel);

        if (secondaryText) {
            const divider = document.createElement('div');
            divider.className = 'pokemon-divider';
            textWrap.appendChild(divider);

            const secondaryLabel = document.createElement('span');
            secondaryLabel.className = 'pokemon-secondary';
            secondaryLabel.textContent = secondaryText;
            textWrap.appendChild(secondaryLabel);
        }

        button.appendChild(textWrap);

        button.addEventListener('click', () => {
            console.log('Clicked:', primaryName, row);
        });

        container.appendChild(button);
    });
}

const input = document.getElementById('filterInput');
input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const value = input.value.trim().toLowerCase();
        if (value.length > 0) {
            activeFilters.push(value);
            input.value = '';
            updateList();
        }
    }
});

loadCsv(CSV_URL)
    .then(parsedData => {
        headers = parsedData.headers;
        allRows = parsedData.rows;
        renderToggleFilters();
        updateList();
    })
    .catch(error => {
        const container = document.getElementById('pokemonList');
        container.textContent = `Unable to load CSV: ${error.message}`;
        console.error(error);
    });
