async function geocodePlace(place, { signal } = {}) {
  const cleanedPlace = place
    .trim()
    .replace(/gulshan1/gi, "Gulshan 1")
    .replace(/gulshan2/gi, "Gulshan 2");

  const query = `${cleanedPlace}, Dhaka, Bangladesh`;

  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?format=jsonv2` +
    `&limit=1` +
    `&q=${encodeURIComponent(query)}`;

  const response = await fetch(url, { signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to connect to geocoding service");
  }

  const results = await response.json();

  if (!results.length) {
    throw new Error(`Location not found: ${place}`);
  }

  return {
    lat: parseFloat(results[0].lat),

    lng: parseFloat(results[0].lon),
  };
}

export { geocodePlace };

