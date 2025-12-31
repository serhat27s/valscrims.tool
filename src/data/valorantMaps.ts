import abyssImage from '@/assets/abyss-map.png';
import pearlImage from '@/assets/pearl-map.png';

export interface ValorantMap {
  id: string;
  name: string;
  image: string;
}

export const valorantMaps: ValorantMap[] = [
  {
    id: 'ascent',
    name: 'Ascent',
    image: 'https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/splash.png'
  },
  {
    id: 'bind',
    name: 'Bind',
    image: 'https://media.valorant-api.com/maps/2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba/splash.png'
  },
  {
    id: 'breeze',
    name: 'Breeze',
    image: 'https://media.valorant-api.com/maps/2fb9a4fd-47b8-4e7d-a969-74b4046ebd53/splash.png'
  },
  {
    id: 'fracture',
    name: 'Fracture',
    image: 'https://media.valorant-api.com/maps/b529448b-4d60-346e-e89e-00a4c527a405/splash.png'
  },
  {
    id: 'haven',
    name: 'Haven',
    image: 'https://media.valorant-api.com/maps/2bee0dc9-4ffe-519b-1cbd-7fbe763a6047/splash.png'
  },
  {
    id: 'icebox',
    name: 'Icebox',
    image: 'https://media.valorant-api.com/maps/e2ad5c54-4114-a870-9641-8ea21279579a/splash.png'
  },
  {
    id: 'lotus',
    name: 'Lotus',
    image: 'https://media.valorant-api.com/maps/2fe4ed3a-450a-948b-6d6b-e89a78e680a9/splash.png'
  },
  {
    id: 'pearl',
    name: 'Pearl',
    image: pearlImage
  },
  {
    id: 'split',
    name: 'Split',
    image: 'https://media.valorant-api.com/maps/d960549e-485c-e861-8d71-aa9d1aed12a2/splash.png'
  },
  {
    id: 'sunset',
    name: 'Sunset',
    image: 'https://media.valorant-api.com/maps/92584fbe-486a-b1b2-9faa-39b0f486b498/splash.png'
  },
  {
    id: 'abyss',
    name: 'Abyss',
    image: abyssImage
  },
  {
    id: 'corrode',
    name: 'Corrode',
    image: 'https://media.valorant-api.com/maps/1c18ab1f-420d-0d8b-71d0-77ad3c439115/splash.png'
  }
];
