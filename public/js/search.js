console.log("Search JS Loaded");

const input = document.getElementById("searchInput");
const box = document.getElementById("searchSuggestions");

console.log(input);
console.log(box);

input.addEventListener("input", async function () {

    console.log("Typing:", input.value);

    const res = await fetch(`/listings/search/suggestions?search=${input.value}`);

    const data = await res.json();

    console.log(data);

});