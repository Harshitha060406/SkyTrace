const map = L.map('map').setView([20.5937, 78.9629], 5); // Centered on India

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

// Convert heading degrees to cardinal directions
function getCardinalDirection(deg) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];
  const index = Math.round(deg / 45);
  return directions[index];
}

async function loadAircraftData() {
  const bounds = map.getBounds();
  const url = `https://opensky-network.org/api/states/all?lamin=${bounds.getSouth()}&lomin=${bounds.getWest()}&lamax=${bounds.getNorth()}&lomax=${bounds.getEast()}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    // Remove old markers (but not tile layers)
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    if (data.states) {
      data.states.forEach(state => {
        const callsign = state[1]?.trim() || "Unknown";
        const lat = state[6];
        const lon = state[5];
        const velocity = (state[9] * 3.6).toFixed(1); // m/s to km/h
        const alt = state[7];
        const time = new Date(state[4] * 1000).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
        const vertical = state[11];
        const heading = state[10];
        const country = state[2];
        const onGround = state[8];

        const direction = heading != null ? getCardinalDirection(heading) : "N/A";
        const status = onGround ? "🛬 Landed" : "✈ In Air";
        const trend = vertical > 1 ? "⬆ Climbing" : vertical < -1 ? "⬇ Descending" : "➡ Level";

        if (lat && lon) {
          const marker = L.marker([lat, lon]).addTo(map);
          marker.bindPopup(`
            <b>Flight:</b> ${callsign}<br>
            <b>Country:</b> ${country}<br>
            <b>Status:</b> ${status}<br>
            <b>Altitude Trend:</b> ${trend}<br>
            <b>Heading:</b> ${direction} (${heading != null ? heading.toFixed(0) : "N/A"}°)<br>
            <b>Speed:</b> ${velocity} km/h<br>
            <b>Altitude:</b> ${alt} m<br>
            <b>Last Contact (IST):</b> ${time}
          `);
        }
      });
    }
  } catch (err) {
    console.error("Error fetching flight data:", err);
  }
}

function searchFlight() {
  const input = document.getElementById("searchInput").value.trim().toUpperCase();
  if (!input) return;

  const url = `https://opensky-network.org/api/states/all`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const found = data.states.find(state => state[1]?.trim() === input);
      if (found) {
        const lat = found[6];
        const lon = found[5];
        const velocity = (found[9] * 3.6).toFixed(1);
        const alt = found[7];
        const time = new Date(found[4] * 1000).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
        const vertical = found[11];
        const heading = found[10];
        const country = found[2];
        const onGround = found[8];

        const direction = heading != null ? getCardinalDirection(heading) : "N/A";
        const status = onGround ? "🛬 Landed" : "✈ In Air";
        const trend = vertical > 1 ? "⬆ Climbing" : vertical < -1 ? "⬇ Descending" : "➡ Level";

        if (lat && lon) {
          map.setView([lat, lon], 7);
          L.marker([lat, lon])
            .addTo(map)
            .bindPopup(`
              <b>Flight:</b> ${input}<br>
              <b>Country:</b> ${country}<br>
              <b>Status:</b> ${status}<br>
              <b>Altitude Trend:</b> ${trend}<br>
              <b>Heading:</b> ${direction} (${heading != null ? heading.toFixed(0) : "N/A"}°)<br>
              <b>Speed:</b> ${velocity} km/h<br>
              <b>Altitude:</b> ${alt} m<br>
              <b>Last Contact (IST):</b> ${time}
            `)
            .openPopup();
        }
      } else {
        alert("Flight not found.");
      }
    })
    .catch(err => {
      console.error("Search error:", err);
    });
}

// Load flights when the page is ready
document.addEventListener("DOMContentLoaded", () => {
  loadAircraftData();
  setInterval(loadAircraftData, 15000);
});