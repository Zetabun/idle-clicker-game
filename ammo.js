const ammoOptions = document.querySelectorAll('input[name="ammo"]');

// Load the selected ammo type if it exists
window.onload = function() {
    const selectedAmmo = localStorage.getItem('selectedAmmo');
    if (selectedAmmo) {
        document.getElementById(selectedAmmo).checked = true;
    }
};

// Save the selected ammo type when a new one is chosen
ammoOptions.forEach(option => {
    option.addEventListener('change', function() {
        localStorage.setItem('selectedAmmo', this.id);
    });
});
