import { apiRequest } from './api-client.js';

export async function getAccessibilityMap() {
  const [stats, layout] = await Promise.all([
    apiRequest('/regions/districts'),
    mockActivity.getAccessibilityMap(),
  ]);
  const month = String(stats.month ?? '');
  const query = month ? `?month=${encodeURIComponent(month)}` : '';
  const [markers, ...details] = await Promise.all([
    apiRequest(`/regions/markers${query}`),
    ...stats.districts.map(({ district }) => apiRequest(`/regions/districts/${encodeURIComponent(district)}${query}`)),
  ]);
  const districts = stats.districts.flatMap((district, index) => {
    const shape = layout.districts.find(item => item.id === district.district.toLowerCase() || item.name === district.name);
    if (!shape) return [];
    const facilities = markers.facilities.filter(item => item.district === district.district);
    const programs = markers.programs.filter(item => item.district === district.district && item.accessible);
    const locations = [...facilities, ...programs];
    const latitudes = locations.map(item => item.latitude);
    const longitudes = locations.map(item => item.longitude);
    const south = Math.min(...latitudes);
    const west = Math.min(...longitudes);
    const height = Math.max(...latitudes) - south || 1;
    const width = Math.max(...longitudes) - west || 1;
    const [x, y] = shape.labelPoint;
    const point = item => [x - 46 + 92 * (item.longitude - west) / width, y + 46 - 92 * (item.latitude - south) / height];
    return [{
      ...district,
      id: shape.id,
      boundary: shape.boundary,
      labelPoint: shape.labelPoint,
      facilityPoints: facilities.map(point),
      programPoints: programs.map(point),
      summary: '',
      neighborhoods: details[index].emds.map(item => ({ ...item, name: item.emdName })),
    }];
  });
  return { districts, month: Number(month.slice(5)) || null, schematic: true };
}
