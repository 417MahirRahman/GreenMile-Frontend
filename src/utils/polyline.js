export function decodePolyline(encoded = "") {
  let index = 0, latitude = 0, longitude = 0;
  const points = [];
  function delta() {
    let result = 0, shift = 0, byte;
    do {
      if (index >= encoded.length || shift > 30) throw new Error("Invalid route geometry.");
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 31) << shift;
      shift += 5;
    } while (byte >= 32);
    return result & 1 ? ~(result >> 1) : result >> 1;
  }
  while (index < encoded.length) {
    latitude += delta(); longitude += delta();
    points.push({ lat: latitude / 100000, lng: longitude / 100000 });
  }
  return points;
}
