
// Example starter JavaScript for disabling form submissions if there are invalid fields
(() => {
  'use strict'

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }

      form.classList.add('was-validated')
    }, false)
  })
})()

// Auto-hide Flash Messages

setTimeout(() => {

    const alert = document.querySelector(".alert");

    if (alert) {

        const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);

        bsAlert.close();

    }

}, 3000);
const shareBtn = document.getElementById("shareBtn");

if (shareBtn) {

    shareBtn.addEventListener("click", async () => {

        try {

            await navigator.clipboard.writeText(window.location.href);

            alert("Listing link copied!");

        } catch {

            alert("Unable to copy.");

        }

    });

}