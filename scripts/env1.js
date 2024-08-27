window.onload = function() {
    const canvas = document.getElementById('desertCanvas');
    const ctx = canvas.getContext('2d');

    // Resize the canvas to fill the screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    console.log('Canvas initialized:', canvas.width, canvas.height);

    // Cycle duration setup
    const cycleDuration = 60 * 1000; // 60 seconds for a full cycle

    // Load the start time from localStorage or use the current time
    let startTime = localStorage.getItem('desertCycleStartTime');
    if (!startTime) {
        startTime = Date.now();
        localStorage.setItem('desertCycleStartTime', startTime);
        console.log(`Initial start time set: ${new Date(startTime).toLocaleTimeString()}`);
    } else {
        console.log(`Loaded start time from localStorage: ${new Date(parseInt(startTime)).toLocaleTimeString()}`);
    }

    // Array to hold wind particles
    let windParticles = [];

    // Initial wind intensity settings
    let windIntensity = {
        quantity: 0,  // Start with no particles
        speedMultiplier: 1.0  // Multiplier for particle speed
    };

    // Function to get the player's cell count from the existing game save
    function getPlayerCellCount() {
        const savedState = JSON.parse(localStorage.getItem('alienGameSave'));
        const cellCount = savedState ? savedState.cells : 0;
        console.log('Retrieved player cell count:', cellCount); // Log the cell count
        return cellCount;
    }

    // Function to create a wind particle
    function createWindParticle() {
        const particle = {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 5 + 2,
            speedX: (Math.random() * 4 + 2) * windIntensity.speedMultiplier,
            speedY: (Math.random() * 2 - 1) * windIntensity.speedMultiplier,
            opacity: Math.random() * 0.4 + 0.1,
            directionChangeRate: Math.random() * 0.05 + 0.01
        };
        return particle;
    }

    // Function to adjust wind intensity based on cell count
    function adjustWindIntensityBasedOnCells() {
        const cellCount = getPlayerCellCount();
        windIntensity.quantity = Math.min(200, Math.floor(cellCount / 50));
        windIntensity.speedMultiplier = Math.min(2.0, 0.5 + (cellCount / 20000));
        console.log(`Adjusted wind intensity: quantity=${windIntensity.quantity}, speedMultiplier=${windIntensity.speedMultiplier.toFixed(2)}`);

        windParticles = [];
        for (let i = 0; i < windIntensity.quantity; i++) {
            windParticles.push(createWindParticle());
        }

        console.log(`Number of particles created: ${windParticles.length}`);
    }

    // Draw the entire scene with a dynamically adjusted gradient
    function drawScene() {
        // Calculate the current time in the cycle
        const currentTime = Date.now();
        const elapsedTime = (currentTime - startTime) % cycleDuration;

        // Calculate the phase of the cycle (0 to 1)
        const cyclePhase = elapsedTime / cycleDuration;

        // Determine the brightness based on the cycle phase (brighter during day, darker during night)
        const brightness = Math.sin(cyclePhase * Math.PI * 2) * 0.5 + 0.5;

        // Adjust sky and sand colors based on the brightness
        const sceneGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        sceneGradient.addColorStop(0, `rgba(${255 * brightness}, ${123 * brightness}, ${84 * brightness}, 1)`); // Sky color
        sceneGradient.addColorStop(0.5, `rgba(${168 * brightness}, ${50 * brightness}, ${50 * brightness}, 1)`); // Transition color
        sceneGradient.addColorStop(1, `rgba(${156 * brightness}, ${62 * brightness}, ${39 * brightness}, 1)`); // Sand color

        ctx.fillStyle = sceneGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        console.log('Scene drawn with brightness:', brightness.toFixed(2));
    }

    // Draw a single wind particle
    function drawWindParticle(particle) {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
        ctx.fill();
        ctx.closePath();
    }

    // Update a wind particle's position
    function updateWindParticle(particle) {
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        if (particle.x > canvas.width) {
            particle.x = 0;
            particle.y = Math.random() * canvas.height;
        }
        if (particle.y > canvas.height || particle.y < 0) {
            particle.y = Math.random() * canvas.height;
            particle.x = Math.random() * canvas.width;
        }
    }

    // Main animation loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the scene with day-night cycle effect
        drawScene();

        windParticles.forEach(particle => {
            drawWindParticle(particle);
            updateWindParticle(particle);
        });

        requestAnimationFrame(animate);
    }

    // Adjust wind intensity based on player's cell count
    adjustWindIntensityBasedOnCells();

    // Start the animation loop
    animate();

    // Adjust wind intensity periodically in case player's cell count changes
    setInterval(adjustWindIntensityBasedOnCells, 5000);

    // Adjust canvas size on window resize
    window.addEventListener('resize', function() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        animate();
    });

    // Save the start time in localStorage when the user leaves
    window.addEventListener('beforeunload', function() {
        localStorage.setItem('desertCycleStartTime', startTime);
        console.log('Saved start time to localStorage:', new Date(parseInt(startTime)).toLocaleTimeString());
    });

    // Add event listener for the hamburger menu
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', function() {
            window.location.href = 'menus.html'; // Redirect to menus.html when clicked
        });
    }
};
