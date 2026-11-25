export interface Temple {
  id: string;
  name: string;
  district: string;
  description: string;
  image: string;
  deity: string;
  significance: string;
}

export interface District {
  id: string;
  name: string;
  region: string;
  description: string;
  image: string;
  templeCount?: number;
}

export interface GalleryImage {
  id: string;
  url: string;
  caption: string;
  category: string;
}

export const temples: Temple[] = [
  {
    id: 'meenakshi-amman',
    name: 'Meenakshi Amman Temple',
    district: 'Madurai',
    description: 'A historic Hindu temple dedicated to Goddess Meenakshi and Lord Sundareswarar, renowned for its towering gopurams covered in thousands of colorful sculptures.',
    image: 'https://images.pexels.com/photos/33895627/pexels-photo-33895627.jpeg?auto=compress&cs=tinysrgb&w=1200',
    deity: 'Goddess Meenakshi & Lord Sundareswarar',
    significance: 'One of the largest temple complexes in India, a masterpiece of Dravidian architecture.',
  },
  {
    id: 'brihadeeswarar',
    name: 'Brihadeeswarar Temple',
    district: 'Thanjavur',
    description: 'A UNESCO World Heritage Site built by Raja Raja Chola I, featuring a 216-foot vimana and a massive monolithic Nandi statue.',
    image: 'https://images.pexels.com/photos/5138790/pexels-photo-5138790.jpeg?auto=compress&cs=tinysrgb&w=1200',
    deity: 'Lord Shiva (Brihadeeswarar)',
    significance: 'Great Living Chola Temple, over 1000 years old.',
  },
  {
    id: 'ramanathaswamy',
    name: 'Ramanathaswamy Temple',
    district: 'Ramanathapuram',
    description: 'One of the twelve Jyotirlingas, famous for its magnificent corridor with intricately carved pillars and sacred water tanks.',
    image: 'https://images.pexels.com/photos/34148386/pexels-photo-34148386.jpeg?auto=compress&cs=tinysrgb&w=1200',
    deity: 'Lord Ramanathaswamy (Shiva)',
    significance: 'One of the Char Dham pilgrimage sites.',
  },
  {
    id: 'arunachaleswarar',
    name: 'Arunachaleswarar Temple',
    district: 'Tiruvannamalai',
    description: 'Located at the foot of the sacred Arunachala hill, this temple is one of the Pancha Bhoota Stalas representing the element of fire.',
    image: 'https://images.pexels.com/photos/26524953/pexels-photo-26524953.jpeg?auto=compress&cs=tinysrgb&w=1200',
    deity: 'Lord Arunachaleswarar (Shiva)',
    significance: 'Pancha Bhoota Stala — Fire element.',
  },
  {
    id: 'sriranganathaswamy',
    name: 'Sri Ranganathaswamy Temple',
    district: 'Tiruchirappalli',
    description: 'The largest functioning Hindu temple in the world, spanning 156 acres with 21 gopurams dedicated to Lord Ranganatha.',
    image: 'https://images.pexels.com/photos/37662256/pexels-photo-37662256.jpeg?auto=compress&cs=tinysrgb&w=1200',
    deity: 'Lord Ranganatha (Vishnu)',
    significance: 'Foremost of the eight Divya Desams.',
  },
  {
    id: 'kapaleeshwarar',
    name: 'Kapaleeshwarar Temple',
    district: 'Chennai',
    description: 'A classic Dravidian style temple in Mylapore, dedicated to Lord Shiva, featuring a beautifully carved 120-foot gopuram.',
    image: 'https://images.pexels.com/photos/774282/pexels-photo-774282.jpeg?auto=compress&cs=tinysrgb&w=1200',
    deity: 'Lord Kapaleeshwarar (Shiva)',
    significance: 'One of Chennai\'s most iconic temples.',
  },
];

const districtImages = [
  'https://images.pexels.com/photos/37626302/pexels-photo-37626302.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/39498479/pexels-photo-39498479.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/10070972/pexels-photo-10070972.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/11539838/pexels-photo-11539838.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/40020598/pexels-photo-40020598.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/35341456/pexels-photo-35341456.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/31695660/pexels-photo-31695660.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/37678479/pexels-photo-37678479.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/35279373/pexels-photo-35279373.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/32547442/pexels-photo-32547442.jpeg?auto=compress&cs=tinysrgb&w=800',
];

const districtNames: { name: string; region: string; description: string }[] = [
  { name: 'Chennai', region: 'North', description: 'The capital city, home to Kapaleeshwarar and Parthasarathy temples.' },
  { name: 'Madurai', region: 'South', description: 'Temple city famous for the Meenakshi Amman Temple.' },
  { name: 'Thanjavur', region: 'Central', description: 'Chola heartland with the Brihadeeswarar Temple.' },
  { name: 'Tiruchirappalli', region: 'Central', description: 'Home to Srirangam and Rockfort temples.' },
  { name: 'Ramanathapuram', region: 'South', description: 'Sacred Rameswaram and the Ramanathaswamy Temple.' },
  { name: 'Tiruvannamalai', region: 'North', description: 'Arunachala hill and Arunachaleswarar Temple.' },
  { name: 'Kancheepuram', region: 'North', description: 'City of a thousand temples, famous for silk and divinity.' },
  { name: 'Kumbakonam', region: 'Central', description: 'Temple town with numerous heritage shrines.' },
  { name: 'Coimbatore', region: 'West', description: 'Industrial hub with ancient hill temples.' },
  { name: 'Vellore', region: 'North', description: 'Home to the golden Sripuram Lakshmi Narayani Temple.' },
  { name: 'Salem', region: 'West', description: 'Surrounded by hills with historic Shakthi shrines.' },
  { name: 'Tirunelveli', region: 'South', description: 'Nellaiappar Temple and scenic heritage.' },
  { name: 'Erode', region: 'West', description: 'Bhavani Sangameshwarar and textile heritage.' },
  { name: 'Tiruppur', region: 'West', description: 'Agricultural heartland with rural temples.' },
  { name: 'Dindigul', region: 'Central', description: 'Hill fort city with Abirami Amman Temple.' },
  { name: 'Thoothukudi', region: 'South', description: 'Pearl city with Srilakshmi Narayana Perumal Temple.' },
  { name: 'Virudhunagar', region: 'South', description: 'Birthplace of Kamaraj with heritage temples.' },
  { name: 'Sivaganga', region: 'South', description: 'Historic kingdom with Karpagavinayagar Temple.' },
  { name: 'Theni', region: 'South', description: 'Gateway to Megamalai with hill temples.' },
  { name: 'Nagapattinam', region: 'Central', description: 'Coastal district with Navagraha temples.' },
  { name: 'Cuddalore', region: 'Central', description: 'Silver Beach and ancient Veeratteswarar Temple.' },
  { name: 'Viluppuram', region: 'North', description: 'Gingee fort region with heritage shrines.' },
  { name: 'Tiruvarur', region: 'Central', description: 'Birthplace of Trinity of Carnatic music.' },
  { name: 'Nagapattinam', region: 'Central', description: 'Navagraha temple circuit hub.' },
  { name: 'Pudukkottai', region: 'Central', description: 'Royal heritage with rock-cut temples.' },
  { name: 'Perambalur', region: 'Central', description: 'Sri Sathyagiriswarar Temple heritage.' },
  { name: 'Ariyalur', region: 'Central', description: 'Fossil-rich district with ancient temples.' },
  { name: 'Karur', region: 'Central', description: 'Cholas-era Pasupathiswarar Temple.' },
  { name: 'Namakkal', region: 'West', description: 'Namagiri Lakshmi Narasimhar hill temple.' },
  { name: 'Krishnagiri', region: 'North', description: 'Hill district with historic forts and temples.' },
  { name: 'Dharmapuri', region: 'North', description: 'Hogenakkal falls and Subramanya shrines.' },
  { name: 'Tirupattur', region: 'North', description: 'Javadi hills with Murugan temples.' },
  { name: 'Ranipet', region: 'North', description: 'Arcot region with traditional temples.' },
  { name: 'Chengalpattu', region: 'North', description: 'Gateway to Mahabalipuram shore temples.' },
  { name: 'Kallakurichi', region: 'Central', description: 'Western ghats foothills with rural shrines.' },
  { name: 'Tenkasi', region: 'South', description: 'Kutralanathar Temple and Courtallam falls.' },
  { name: 'Kanniyakumari', region: 'South', description: 'Southern tip with Bhagavathy Amman Temple.' },
  { name: 'Sivaganga', region: 'South', description: 'Pilgrimage heritage with Pillayarpatti.' },
  { name: 'Ramanathapuram', region: 'South', description: 'Rameswaram island sacred pilgrimage.' },
];

export const districts: District[] = districtNames.map((d, i) => ({
  id: d.name.toLowerCase().replace(/\s+/g, '-'),
  name: d.name,
  region: d.region,
  description: d.description,
  image: districtImages[i % districtImages.length],
}));

export const galleryImages: GalleryImage[] = [
  { id: 'g1', url: 'https://images.pexels.com/photos/37626302/pexels-photo-37626302.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Intricate Gopuram Sculptures', category: 'Architecture' },
  { id: 'g2', url: 'https://images.pexels.com/photos/32654427/pexels-photo-32654427.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Rameswaram Temple Tower', category: 'Gopurams' },
  { id: 'g3', url: 'https://images.pexels.com/photos/35341456/pexels-photo-35341456.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Stone Pillar Carvings', category: 'Architecture' },
  { id: 'g4', url: 'https://images.pexels.com/photos/36849624/pexels-photo-36849624.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Temple Festival Celebration', category: 'Festivals' },
  { id: 'g5', url: 'https://images.pexels.com/photos/37678479/pexels-photo-37678479.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Temple Corridor, Tiruchirappalli', category: 'Corridors' },
  { id: 'g6', url: 'https://images.pexels.com/photos/11539838/pexels-photo-11539838.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Andal Temple Tower, Srivilliputhur', category: 'Gopurams' },
  { id: 'g7', url: 'https://images.pexels.com/photos/35279373/pexels-photo-35279373.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Kumbakonam Temple Corridor', category: 'Corridors' },
  { id: 'g8', url: 'https://images.pexels.com/photos/36849683/pexels-photo-36849683.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Traditional Procession', category: 'Festivals' },
  { id: 'g9', url: 'https://images.pexels.com/photos/5138790/pexels-photo-5138790.jpeg?auto=compress&cs=tinysrgb&w=800', caption: 'Brihadeeswarar Temple, Thanjavur', category: 'Architecture' },
];

export const heroSlides = [
  {
    id: 'slide1',
    image: 'https://images.pexels.com/photos/5138790/pexels-photo-5138790.jpeg?auto=compress&cs=tinysrgb&w=1920',
    caption: 'Brihadeeswarar Temple, Thanjavur',
  },
  {
    id: 'slide2',
    image: 'https://images.pexels.com/photos/33895627/pexels-photo-33895627.jpeg?auto=compress&cs=tinysrgb&w=1920',
    caption: 'Meenakshi Amman Temple, Madurai',
  },
  {
    id: 'slide3',
    image: 'https://images.pexels.com/photos/26524953/pexels-photo-26524953.jpeg?auto=compress&cs=tinysrgb&w=1920',
    caption: 'Arunachaleswarar Temple, Tiruvannamalai',
  },
  {
    id: 'slide4',
    image: 'https://images.pexels.com/photos/34148386/pexels-photo-34148386.jpeg?auto=compress&cs=tinysrgb&w=1920',
    caption: 'Ramanathaswamy Temple, Rameswaram',
  },
];

