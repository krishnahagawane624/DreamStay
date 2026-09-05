(function () {

    const track = document.getElementById("reco-carousel-track");
    if (!track) return;

    const cards = Array.from(track.querySelectorAll(".reco-card"));
    const dots = Array.from(document.querySelectorAll("#reco-dots .reco-dot"));
    const prevBtn = document.getElementById("reco-prev-btn");
    const nextBtn = document.getElementById("reco-next-btn");

    if (cards.length === 0) return;

    let activeIndex = 0;

    function getSpacing() {
        return window.innerWidth < 768 ? 150 : 230;
    }

    function render() {

        const spacing = getSpacing();

        cards.forEach((card, i) => {

            const offset = i - activeIndex;
            const abs = Math.abs(offset);

            const translateX = offset * spacing;
            const scale = offset === 0 ? 1 : Math.max(0.72, 1 - abs * 0.14);
            const translateY = offset === 0 ? -18 : 14;
            const opacity = abs > 2 ? 0 : (offset === 0 ? 1 : 1 - abs * 0.28);
            const zIndex = 100 - abs;

            card.style.transform = `translateX(${translateX}px) translateY(${translateY}px) scale(${scale})`;
            card.style.opacity = opacity;
            card.style.zIndex = zIndex;
            card.style.pointerEvents = abs > 2 ? "none" : "auto";
            card.classList.toggle("reco-card-active", offset === 0);

        });

        dots.forEach((dot, i) => dot.classList.toggle("active", i === activeIndex));

    }

    function goTo(index) {
        activeIndex = Math.max(0, Math.min(cards.length - 1, index));
        render();
    }

    if (prevBtn) prevBtn.addEventListener("click", () => goTo(activeIndex - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => goTo(activeIndex + 1));

    dots.forEach((dot) => {
        dot.addEventListener("click", () => goTo(parseInt(dot.dataset.index, 10)));
    });

    cards.forEach((card, i) => {

        const link = card.querySelector(".reco-card-link");

        link.addEventListener("click", (e) => {

            if (i !== activeIndex) {
                e.preventDefault();
                goTo(i);
            }

        });

    });

    let startX = 0;
    let dragging = false;

    track.addEventListener("pointerdown", (e) => {
        startX = e.clientX;
        dragging = true;
    });

    track.addEventListener("pointerup", (e) => {

        if (!dragging) return;

        dragging = false;

        const diff = e.clientX - startX;

        if (diff > 40) {
            goTo(activeIndex - 1);
        } else if (diff < -40) {
            goTo(activeIndex + 1);
        }

    });

    track.addEventListener("pointerleave", () => {
        dragging = false;
    });

    track.addEventListener("keydown", (e) => {

        if (e.key === "ArrowLeft") goTo(activeIndex - 1);
        if (e.key === "ArrowRight") goTo(activeIndex + 1);

    });

    window.addEventListener("resize", render);

    render();

})();