export type LandingNode = {
  id: string;
  name: string;
  lng: number;
  lat: number;
  gateway: boolean;
};

export type LandingHop = {
  id: string;
  from: string;
  to: string;
};

export const landingNodes: LandingNode[] = [
  { id: "bcn", name: "Barcelona gateway", lng: 2.1734, lat: 41.3851, gateway: true },
  { id: "vlc", name: "Valencia node", lng: -0.3763, lat: 39.4699, gateway: false },
  { id: "mad", name: "Madrid gateway", lng: -3.7038, lat: 40.4168, gateway: true },
  { id: "zar", name: "Zaragoza node", lng: -0.8891, lat: 41.6488, gateway: false },
  { id: "bio", name: "Bilbao node", lng: -2.9253, lat: 43.263, gateway: false },
  { id: "lis", name: "Lisbon node", lng: -9.1393, lat: 38.7223, gateway: false },
  { id: "seo", name: "Seville node", lng: -5.9845, lat: 37.3891, gateway: false },
  { id: "tls", name: "Toulouse node", lng: 1.4442, lat: 43.6047, gateway: false },
  { id: "mrs", name: "Marseille node", lng: 5.3698, lat: 43.2965, gateway: false },
  { id: "pmn", name: "Palma node", lng: 2.6502, lat: 39.5696, gateway: false },
];

export const landingGlobeNodes: LandingNode[] = [
  ...landingNodes,
  { id: "lon", name: "London gateway", lng: -0.1276, lat: 51.5074, gateway: true },
  { id: "ber", name: "Berlin node", lng: 13.405, lat: 52.52, gateway: false },
  { id: "ams", name: "Amsterdam node", lng: 4.9041, lat: 52.3676, gateway: false },
  { id: "rom", name: "Rome node", lng: 12.4964, lat: 41.9028, gateway: false },
  { id: "ath", name: "Athens node", lng: 23.7275, lat: 37.9838, gateway: false },
  { id: "ist", name: "Istanbul node", lng: 28.9784, lat: 41.0082, gateway: false },
  { id: "cai", name: "Cairo node", lng: 31.2357, lat: 30.0444, gateway: false },
  { id: "nbo", name: "Nairobi node", lng: 36.8219, lat: -1.2921, gateway: false },
  { id: "cpt", name: "Cape Town gateway", lng: 18.4241, lat: -33.9249, gateway: true },
  { id: "dxb", name: "Dubai node", lng: 55.2708, lat: 25.2048, gateway: false },
  { id: "del", name: "Delhi node", lng: 77.209, lat: 28.6139, gateway: false },
  { id: "sin", name: "Singapore gateway", lng: 103.8198, lat: 1.3521, gateway: true },
  { id: "tky", name: "Tokyo gateway", lng: 139.6917, lat: 35.6895, gateway: true },
  { id: "sel", name: "Seoul node", lng: 126.978, lat: 37.5665, gateway: false },
  { id: "syd", name: "Sydney gateway", lng: 151.2093, lat: -33.8688, gateway: true },
  { id: "akl", name: "Auckland node", lng: 174.7633, lat: -36.8485, gateway: false },
  { id: "sfo", name: "San Francisco node", lng: -122.4194, lat: 37.7749, gateway: false },
  { id: "nyc", name: "New York gateway", lng: -74.006, lat: 40.7128, gateway: true },
  { id: "chi", name: "Chicago node", lng: -87.6298, lat: 41.8781, gateway: false },
  { id: "van", name: "Vancouver node", lng: -123.1207, lat: 49.2827, gateway: false },
  { id: "mex", name: "Mexico City node", lng: -99.1332, lat: 19.4326, gateway: false },
  { id: "sao", name: "São Paulo gateway", lng: -46.6333, lat: -23.5505, gateway: true },
  { id: "bue", name: "Buenos Aires node", lng: -58.3816, lat: -34.6037, gateway: false },
];

export const landingHops: LandingHop[] = [
  { id: "bcn-vlc", from: "bcn", to: "vlc" },
  { id: "bcn-zar", from: "bcn", to: "zar" },
  { id: "bcn-pmn", from: "bcn", to: "pmn" },
  { id: "bcn-tls", from: "bcn", to: "tls" },
  { id: "bcn-mrs", from: "bcn", to: "mrs" },
  { id: "mad-zar", from: "mad", to: "zar" },
  { id: "mad-vlc", from: "mad", to: "vlc" },
  { id: "mad-seo", from: "mad", to: "seo" },
  { id: "mad-bio", from: "mad", to: "bio" },
  { id: "lis-seo", from: "lis", to: "seo" },
  { id: "lis-mad", from: "lis", to: "mad" },
  { id: "bio-zar", from: "bio", to: "zar" },
];
