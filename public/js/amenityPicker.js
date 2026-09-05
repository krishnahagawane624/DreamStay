// ==========================================
// AMENITY PICKER — searchable multi-select widget
// Reads the full catalog + any already-selected amenities from JSON <script>
// tags embedded in the page, lets the user search-and-click to add, renders
// each pick as a chip with its icon, and keeps a hidden <input> per
// selection so the values submit with the surrounding form as
// listing[amenities][].
// ==========================================

(function () {

    const root = document.getElementById("amenity-picker");
    if (!root) return;

    const catalogDataEl = document.getElementById("amenities-catalog-data");
    const selectedDataEl = document.getElementById("selected-amenities-data");

    if (!catalogDataEl) return;

    let catalog = [];
    let selectedIds = [];

    try {
        catalog = JSON.parse(catalogDataEl.textContent);
    } catch (err) {
        console.error("Amenity picker: couldn't parse catalog", err);
        return;
    }

    if (selectedDataEl) {
        try {
            selectedIds = JSON.parse(selectedDataEl.textContent) || [];
        } catch (err) {
            selectedIds = [];
        }
    }

    const catalogById = {};
    catalog.forEach(a => { catalogById[a.id] = a; });

    const searchInput = document.getElementById("amenity-search-input");
    const suggestionsEl = document.getElementById("amenity-suggestions");
    const chipsEl = document.getElementById("amenity-chips");
    const hiddenInputsEl = document.getElementById("amenity-hidden-inputs");
    const emptyHint = document.getElementById("amenity-empty-hint");

    let selected = selectedIds.filter(id => catalogById[id]);

    function renderChips() {

        chipsEl.innerHTML = "";
        hiddenInputsEl.innerHTML = "";

        if (emptyHint) {
            emptyHint.style.display = selected.length === 0 ? "block" : "none";
        }

        selected.forEach((id) => {

            const amenity = catalogById[id];
            if (!amenity) return;

            const chip = document.createElement("span");
            chip.className = "amenity-chip";
            chip.innerHTML =
                `<i class="${amenity.icon}"></i>` +
                `<span>${amenity.label}</span>` +
                `<button type="button" class="amenity-chip-remove" data-id="${amenity.id}" aria-label="Remove ${amenity.label}">` +
                `<i class="fa-solid fa-xmark"></i></button>`;

            chipsEl.appendChild(chip);

            const hidden = document.createElement("input");
            hidden.type = "hidden";
            hidden.name = "listing[amenities][]";
            hidden.value = amenity.id;
            hiddenInputsEl.appendChild(hidden);

        });

        chipsEl.querySelectorAll(".amenity-chip-remove").forEach((btn) => {
            btn.addEventListener("click", () => {
                selected = selected.filter(id => id !== btn.dataset.id);
                renderChips();
            });
        });

    }

    function renderSuggestions(query) {

        suggestionsEl.innerHTML = "";

        const trimmed = query.trim().toLowerCase();

        if (!trimmed) {
            suggestionsEl.classList.remove("open");
            return;
        }

        const matches = catalog
            .filter(a => !selected.includes(a.id))
            .filter(a => a.label.toLowerCase().includes(trimmed))
            .slice(0, 8);

        if (matches.length === 0) {
            suggestionsEl.innerHTML = '<div class="amenity-suggestion-empty">No matching amenities</div>';
            suggestionsEl.classList.add("open");
            return;
        }

        matches.forEach((amenity) => {

            const row = document.createElement("div");
            row.className = "amenity-suggestion-row";
            row.innerHTML =
                `<i class="${amenity.icon}"></i>` +
                `<span>${amenity.label}</span>` +
                `<small class="text-muted">${amenity.category}</small>`;

            row.addEventListener("click", () => {
                selected.push(amenity.id);
                renderChips();
                searchInput.value = "";
                suggestionsEl.innerHTML = "";
                suggestionsEl.classList.remove("open");
                searchInput.focus();
            });

            suggestionsEl.appendChild(row);

        });

        suggestionsEl.classList.add("open");

    }

    searchInput.addEventListener("input", () => renderSuggestions(searchInput.value));

    searchInput.addEventListener("keydown", (e) => {

        if (e.key === "Enter") {
            e.preventDefault();
            const firstRow = suggestionsEl.querySelector(".amenity-suggestion-row");
            if (firstRow) firstRow.click();
        }

        if (e.key === "Escape") {
            suggestionsEl.innerHTML = "";
            suggestionsEl.classList.remove("open");
        }

    });

    document.addEventListener("click", (e) => {
        if (!root.contains(e.target)) {
            suggestionsEl.classList.remove("open");
        }
    });

    // Expose selected amenity LABELS (comma-joined) so the "Generate with AI"
    // description button can include them as context.
    root.getSelectedAmenityLabels = function () {
        return selected.map(id => catalogById[id]?.label).filter(Boolean).join(", ");
    };

    renderChips();

})();